import { getDb, type Database } from "@/lib/db";
import {
  books,
  categories,
  bookImages,
  copies,
  locations,
  donors,
  userBookHearts,
  borrowRequests,
} from "@/lib/db/schema";
import { outer } from "@/lib/db/qualified";
import {
  eq,
  and,
  or,
  sql,
  asc,
  count,
  gte,
  lt,
  getTableColumns,
  type SQL,
  type AnyColumn,
} from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { codeRange, derivedTitleColumns, looksLikeCode, normalizeSearch } from "./search";
import { activeLoanId, copyCount, hasLendableCopy, lendableCopyCount } from "./sql";
import {
  PAGE_SIZE,
  type BookFields,
  type BookFilters,
  type CopyFields,
  type LocationFields,
} from "./schemas";
import type {
  BookListItem,
  BookPage,
  CatalogueFacets,
  CategoryNode,
  CategoryRef,
  CopyView,
  LocationOption,
} from "./types";

export const bookSummaryColumns = {
  id: books.id,
  code: books.code,
  title: books.title,
  author: books.author,
  imageUrl: books.imageUrl,
};
const bookIdRef = outer("books", "id");

const heartsOf = sql<number>`(SELECT count(*) FROM ${userBookHearts} WHERE ${userBookHearts.bookId} = ${bookIdRef})`;

const isHeartedBy = (userId: string | null | undefined) =>
  userId
    ? sql<boolean>`EXISTS (SELECT 1 FROM ${userBookHearts} WHERE ${userBookHearts.userId} = ${userId} AND ${userBookHearts.bookId} = ${bookIdRef})`.mapWith(
        Boolean,
      )
    : sql<boolean>`0`.mapWith(Boolean);

const escapeLike = (text: string) => text.replace(/[\\%_]/g, "\\$&");
const like = (column: AnyColumn | SQL, pattern: string) =>
  sql`${column} LIKE ${pattern} ESCAPE '\\'`;

/** Tests whether a title has a copy matching `where`. The planner can drive this semi-join from the copy index. */
const hasCopy = (where: SQL) =>
  sql`${bookIdRef} IN (SELECT "copies"."book_id" FROM "copies" WHERE ${where})`;

function categoryRef(
  category: { id: string; code: string; name: string },
  parent: { id: string | null; code: string | null; name: string | null } | null,
): CategoryRef {
  return {
    ...category,
    parent: parent?.id ? { id: parent.id, code: parent.code!, name: parent.name! } : null,
  };
}

function listConditions(filters: BookFilters) {
  const conditions: SQL[] = [];

  if (filters.search) {
    if (looksLikeCode(filters.search)) {
      const [from, to] = codeRange(filters.search);
      conditions.push(
        or(
          and(gte(books.code, from), lt(books.code, to)),
          hasCopy(sql`"copies"."code" >= ${from} AND "copies"."code" < ${to}`),
        )!,
      );
    } else {
      for (const token of normalizeSearch(filters.search).split(" ")) {
        conditions.push(like(books.search, `%${escapeLike(token)}%`));
      }
    }
  }

  if (filters.category) {
    conditions.push(
      sql`${books.categoryId} IN (SELECT "id" FROM "categories" WHERE "code" = ${filters.category} OR "parent_id" = (SELECT "id" FROM "categories" WHERE "code" = ${filters.category}))`,
    );
  }

  if (filters.cabinet || filters.shelf !== undefined) {
    const place: SQL[] = [];
    if (filters.cabinet) place.push(sql`"cabinet" = ${filters.cabinet}`);
    if (filters.shelf !== undefined) place.push(sql`"shelf" = ${filters.shelf}`);
    conditions.push(
      hasCopy(sql`"copies"."location_id" IN (SELECT "id" FROM "locations" WHERE ${and(...place)})`),
    );
  }

  if (filters.donor) conditions.push(hasCopy(sql`"copies"."donor_id" = ${filters.donor}`));

  if (filters.availability === "available") conditions.push(hasLendableCopy(bookIdRef));
  if (filters.availability === "unavailable")
    conditions.push(sql`NOT ${hasLendableCopy(bookIdRef)}`);

  if (filters.unlabelled) conditions.push(hasCopy(sql`"copies"."labelled" = 0`));
  if (filters.unplaced) conditions.push(hasCopy(sql`"copies"."location_id" IS NULL`));

  return conditions;
}

export function bookWhere(filters: BookFilters) {
  const conditions = listConditions(filters);
  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * One row per title with its counts, in one statement. Availability comes from index lookups on
 * the copies of the rows returned, never from a read per title, and `LIMIT` stops the scan of
 * the title index before the counts are computed for the rest.
 */
export function bookListQuery(
  db: Database,
  options: {
    where?: SQL;
    userId?: string | null;
    sort?: BookFilters["sort"];
    limit: number;
    offset: number;
  },
) {
  const parent = alias(categories, "parent");
  return db
    .select({
      id: books.id,
      code: books.code,
      title: books.title,
      author: books.author,
      imageUrl: books.imageUrl,
      category: { id: categories.id, code: categories.code, name: categories.name },
      parent: { id: parent.id, code: parent.code, name: parent.name },
      copyCount: copyCount(bookIdRef),
      lendableCount: lendableCopyCount(bookIdRef),
      heartsCount: heartsOf.mapWith(Number),
      isHearted: isHeartedBy(options.userId),
    })
    .from(books)
    .innerJoin(categories, eq(books.categoryId, categories.id))
    .leftJoin(parent, eq(categories.parentId, parent.id))
    .where(options.where)
    .orderBy(...(options.sort === "code" ? [books.code] : [books.titleKey, books.code]))
    .limit(options.limit)
    .offset(options.offset);
}

/** SQLite reads a negative `LIMIT` as "no limit". */
const NO_LIMIT = -1;

export function bookCountQuery(db: Database, where: SQL | undefined) {
  return db.select({ total: count() }).from(books).where(where);
}

const toListItem = ({
  category,
  parent,
  ...rest
}: Awaited<ReturnType<typeof bookListQuery>>[number]): BookListItem => ({
  ...rest,
  category: categoryRef(category, parent),
});

export async function listBooks(filters: BookFilters, userId?: string | null): Promise<BookPage> {
  const db = await getDb();
  const where = bookWhere(filters);
  const query = (page: number) =>
    bookListQuery(db, {
      where,
      userId,
      sort: filters.sort,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });

  let page = filters.page ?? 1;
  // Not `db.batch`: Drizzle maps a batched join by column name and mixes up the same name from two tables.
  const [[{ total }], firstRows] = await Promise.all([bookCountQuery(db, where), query(page)]);
  let rows = firstRows;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > lastPage) {
    page = lastPage;
    rows = await query(page);
  }
  return { items: rows.map(toListItem), total, page, pageSize: PAGE_SIZE };
}

export async function listFavoriteBooks(userId: string): Promise<BookListItem[]> {
  const db = await getDb();
  const rows = await bookListQuery(db, {
    where: sql`${bookIdRef} IN (SELECT "book_id" FROM "user_book_hearts" WHERE "user_id" = ${userId})`,
    userId,
    limit: NO_LIMIT,
    offset: 0,
  });
  return rows.map(toListItem);
}

export async function listBookImagesByBookId(bookId: string) {
  const db = await getDb();
  return db
    .select()
    .from(bookImages)
    .where(eq(bookImages.bookId, bookId))
    .orderBy(bookImages.displayOrder);
}

export async function getBookById(id: string, userId?: string | null) {
  const db = await getDb();
  const parent = alias(categories, "parent");
  const [row] = await db
    .select({
      book: getTableColumns(books),
      category: { id: categories.id, code: categories.code, name: categories.name },
      parent: { id: parent.id, code: parent.code, name: parent.name },
      lendableCount: lendableCopyCount(bookIdRef),
      heartsCount: heartsOf.mapWith(Number),
      isHearted: isHeartedBy(userId),
    })
    .from(books)
    .innerJoin(categories, eq(books.categoryId, categories.id))
    .leftJoin(parent, eq(categories.parentId, parent.id))
    .where(eq(books.id, id))
    .limit(1);
  if (!row) return null;
  return {
    ...row.book,
    category: categoryRef(row.category, row.parent),
    lendableCount: row.lendableCount,
    heartsCount: row.heartsCount,
    isHearted: row.isHearted,
  };
}

const copyViewSelect = () => ({
  ...getTableColumns(copies),
  location: {
    id: locations.id,
    cabinet: locations.cabinet,
    shelf: locations.shelf,
    bay: locations.bay,
  },
  donor: { id: donors.id, name: donors.name },
  loanId: activeLoanId(sql`"copies"."id"`),
});

type CopyRow = Omit<CopyView, "location" | "donor"> & {
  location: { id: string | null } & Record<string, unknown>;
  donor: { id: string | null; name: string | null };
};

const asCopyView = (row: unknown): CopyView => {
  const copy = row as CopyRow;
  return {
    ...copy,
    location: copy.location?.id ? (copy.location as CopyView["location"]) : null,
    donor: copy.donor?.id ? (copy.donor as CopyView["donor"]) : null,
  };
};

export async function listCopies(bookId: string): Promise<CopyView[]> {
  const db = await getDb();
  const rows = await db
    .select(copyViewSelect())
    .from(copies)
    .leftJoin(locations, eq(copies.locationId, locations.id))
    .leftJoin(donors, eq(copies.donorId, donors.id))
    .where(eq(copies.bookId, bookId))
    .orderBy(asc(copies.number));
  return rows.map(asCopyView);
}

/**
 * Sets whether the user has the book as a favorite, in one statement. Setting the state a user
 * already has changes nothing, so repeated or simultaneous calls end in the last state asked for.
 */
export async function setHeartRecord(bookId: string, userId: string, hearted: boolean) {
  const db = await getDb();
  if (hearted) {
    await db.run(sql`
      INSERT INTO ${userBookHearts} (${sql.identifier("id")}, ${sql.identifier("user_id")}, ${sql.identifier("book_id")})
      SELECT ${crypto.randomUUID()}, ${userId}, ${books.id} FROM ${books} WHERE ${books.id} = ${bookId}
      ON CONFLICT DO NOTHING`);
  } else {
    await db
      .delete(userBookHearts)
      .where(and(eq(userBookHearts.bookId, bookId), eq(userBookHearts.userId, userId)));
  }
}

/**
 * Inserts a pending request in one statement that only matches a title with a lendable copy, and
 * returns whether it did. It does not insert when every copy is on loan, missing or in
 * maintenance, or when the user already has a pending request for the title, however many
 * requests arrive at once.
 */
export async function createBorrowRequestRecord(
  bookId: string,
  userId: string,
  note: string | null,
) {
  const db = await getDb();
  const rows = await db.all(sql`
    INSERT INTO ${borrowRequests} (${sql.identifier("id")}, ${sql.identifier("user_id")}, ${sql.identifier("book_id")}, ${sql.identifier("status")}, ${sql.identifier("notes")})
    SELECT ${crypto.randomUUID()}, ${userId}, ${books.id}, 'pending', ${note}
    FROM ${books} WHERE ${books.id} = ${bookId} AND ${lendableCopyCount(sql`"books"."id"`)} > 0
    ON CONFLICT DO NOTHING
    RETURNING ${sql.identifier("id")}`);
  return rows.length > 0;
}

/** True when the category exists and has no subcategories: only those hold titles. */
export async function isLeafCategory(categoryId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        sql`NOT EXISTS (SELECT 1 FROM "categories" AS "child" WHERE "child"."parent_id" = ${categoryId})`,
      ),
    )
    .limit(1);
  return row !== undefined;
}

export async function listLocations(): Promise<LocationOption[]> {
  const db = await getDb();
  return db
    .select({ ...getTableColumns(locations), categoryCode: categories.code })
    .from(locations)
    .leftJoin(categories, eq(locations.categoryId, categories.id))
    .orderBy(locations.cabinet, locations.shelf, locations.bay);
}

export async function listFacets(): Promise<CatalogueFacets> {
  const db = await getDb();
  const [rows, places, donorRows, healthRows] = await Promise.all([
    db
      .select({
        ...getTableColumns(categories),
        bookCount:
          sql<number>`(SELECT count(*) FROM ${books} WHERE ${books.categoryId} = ${outer("categories", "id")})`.mapWith(
            Number,
          ),
      })
      .from(categories)
      .orderBy(categories.code),
    db
      .selectDistinct({ cabinet: locations.cabinet, shelf: locations.shelf })
      .from(locations)
      .orderBy(locations.cabinet, locations.shelf),
    db
      .select({
        id: donors.id,
        name: donors.name,
        motivation: donors.motivation,
        copyCount: sql<number>`count(${copies.id})`.mapWith(Number),
      })
      .from(donors)
      .leftJoin(copies, eq(copies.donorId, donors.id))
      .groupBy(donors.id)
      .orderBy(donors.name),
    db
      .select({
        status: copies.status,
        count: count(),
      })
      .from(copies)
      .groupBy(copies.status),
  ]);

  const nodes = new Map<string, CategoryNode>(
    rows.map((row) => [row.id, { ...row, children: [] }]),
  );
  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
      parent.bookCount += node.bookCount;
    } else {
      roots.push(node);
    }
  }
  roots.sort((a, b) => a.name.localeCompare(b.name, "es"));

  const cabinets: CatalogueFacets["cabinets"] = [];
  for (const { cabinet, shelf } of places) {
    const last = cabinets[cabinets.length - 1];
    if (last?.cabinet === cabinet) last.shelves.push(shelf);
    else cabinets.push({ cabinet, shelves: [shelf] });
  }

  const copyHealth = {
    present: 0,
    maintenance: 0,
    missing: 0,
    unlabelled: 0,
    unplaced: 0,
  };
  for (const row of healthRows) copyHealth[row.status] = Number(row.count);
  const [[{ count: unlabelled }], [{ count: unplaced }]] = await Promise.all([
    db.select({ count: count() }).from(copies).where(eq(copies.labelled, false)),
    db
      .select({ count: count() })
      .from(copies)
      .where(sql`${copies.locationId} IS NULL`),
  ]);
  copyHealth.unlabelled = Number(unlabelled);
  copyHealth.unplaced = Number(unplaced);

  return { categories: roots, cabinets, donors: donorRows, copyHealth };
}

export async function getBookImageById(imageId: string, bookId: string) {
  const db = await getDb();
  const [img] = await db
    .select()
    .from(bookImages)
    .where(and(eq(bookImages.id, imageId), eq(bookImages.bookId, bookId)))
    .limit(1);
  return img ?? null;
}

/*
 * A book's `image_url` is the URL of its cover image. Each write below changes the image rows and
 * `books.image_url` in one batch, which D1 runs as a transaction, so they never disagree.
 */

const coverUrlOf = (bookId: string) =>
  sql`(SELECT ${sql.identifier("image_url")} FROM ${sql.identifier("book_images")} WHERE ${sql.identifier("book_id")} = ${bookId} AND ${sql.identifier("is_cover")} = 1 LIMIT 1)`;

/**
 * Deletes the image. When the book is left without a cover, its first image becomes the cover and
 * the book's image URL follows, or is cleared when no image is left.
 */
export async function deleteBookImageRecord(imageId: string, bookId: string) {
  const db = await getDb();
  await db.batch([
    db.delete(bookImages).where(and(eq(bookImages.id, imageId), eq(bookImages.bookId, bookId))),
    db
      .update(bookImages)
      .set({ isCover: true })
      .where(
        and(
          sql`${bookImages.id} = (SELECT "id" FROM "book_images" WHERE "book_id" = ${bookId} ORDER BY "display_order" LIMIT 1)`,
          sql`${coverUrlOf(bookId)} IS NULL`,
        ),
      ),
    db
      .update(books)
      .set({ imageUrl: coverUrlOf(bookId) })
      .where(eq(books.id, bookId)),
  ]);
}

export async function setCoverImageRecord(imageId: string, bookId: string) {
  const db = await getDb();
  await db.batch([
    db
      .update(bookImages)
      .set({ isCover: sql`${bookImages.id} = ${imageId}` })
      .where(
        and(
          eq(bookImages.bookId, bookId),
          sql`EXISTS (SELECT 1 FROM "book_images" WHERE "id" = ${imageId} AND "book_id" = ${bookId})`,
        ),
      ),
    db
      .update(books)
      .set({ imageUrl: coverUrlOf(bookId) })
      .where(eq(books.id, bookId)),
  ]);
}

/**
 * Adds the image, as the cover when `isCover`. Returns false when another image row already
 * stores that URL.
 */
export async function addBookImageRecord(
  input: {
    bookId: string;
    imageUrl: string;
    isCover: boolean;
    displayOrder: number;
  },
  database?: Database,
) {
  const db = database ?? (await getDb());
  const id = crypto.randomUUID();
  const insert = db
    .insert(bookImages)
    .values({ id, ...input })
    .onConflictDoNothing()
    .returning({ id: bookImages.id });
  if (!input.isCover) return (await insert).length > 0;

  const [inserted] = await db.batch([
    insert,
    db
      .update(bookImages)
      .set({ isCover: false })
      .where(
        and(
          eq(bookImages.bookId, input.bookId),
          sql`${bookImages.id} <> ${id}`,
          sql`EXISTS (SELECT 1 FROM "book_images" WHERE "id" = ${id})`,
        ),
      ),
    db
      .update(books)
      .set({ imageUrl: input.imageUrl })
      .where(
        and(
          eq(books.id, input.bookId),
          sql`EXISTS (SELECT 1 FROM "book_images" WHERE "id" = ${id})`,
        ),
      ),
  ]);
  return inserted.length > 0;
}

export async function deleteBookRecord(bookId: string) {
  const db = await getDb();
  await db.delete(books).where(eq(books.id, bookId));
}

export async function updateBookRecord(id: string, data: BookFields) {
  const db = await getDb();
  const rows = await db
    .update(books)
    .set({ ...data, ...derivedTitleColumns(data.title, data.author), updatedAt: new Date() })
    .where(eq(books.id, id))
    .returning({ id: books.id });
  return rows.length > 0;
}

/**
 * Takes the next book number of the leaf category in one statement, so two titles added at once
 * never share a number. Returns the new book code, or null when the category is missing or has
 * subcategories. A number whose insert later fails is not reused; the gap is harmless.
 */
export async function allocateBookCode(categoryId: string) {
  const db = await getDb();
  const [row] = await db
    .update(categories)
    .set({ nextNumber: sql`${categories.nextNumber} + 1` })
    .where(
      and(
        eq(categories.id, categoryId),
        sql`NOT EXISTS (SELECT 1 FROM "categories" AS "child" WHERE "child"."parent_id" = ${categoryId})`,
      ),
    )
    .returning({ code: categories.code, number: sql<number>`"next_number" - 1`.mapWith(Number) });
  if (!row) return null;
  const separator = row.code.includes(".") ? "." : "";
  return `CA${row.code}${separator}${String(row.number).padStart(2, "0")}`;
}

/** Takes the next copy number of the title in one statement and returns the new copy code. */
export async function allocateCopy(bookId: string) {
  const db = await getDb();
  const [row] = await db
    .update(books)
    .set({ nextCopy: sql`${books.nextCopy} + 1` })
    .where(eq(books.id, bookId))
    .returning({ code: books.code, number: sql<number>`"next_copy" - 1`.mapWith(Number) });
  return row ? { number: row.number, code: `${row.code}.${row.number}` } : null;
}

/** Inserts the title with its first copy in one batch, so a title never exists without it. */
export async function createBookRecord(book: BookFields & { code: string }, copy: CopyFields) {
  const db = await getDb();
  const bookId = crypto.randomUUID();
  const { categoryId, ...fields } = book;
  await db.batch([
    db.insert(books).values({
      id: bookId,
      ...fields,
      categoryId,
      ...derivedTitleColumns(book.title, book.author),
      nextCopy: 2,
    }),
    db.insert(copies).values({ bookId, number: 1, code: `${book.code}.1`, ...copy }),
  ]);
  return { id: bookId, copyCode: `${book.code}.1` };
}

export async function createCopyRecord(
  bookId: string,
  number: number,
  code: string,
  copy: CopyFields,
) {
  const db = await getDb();
  await db.insert(copies).values({ bookId, number, code, ...copy });
}

export async function updateCopyRecord(copyId: string, copy: CopyFields) {
  const db = await getDb();
  const rows = await db
    .update(copies)
    .set({ ...copy, updatedAt: new Date() })
    .where(eq(copies.id, copyId))
    .returning({ bookId: copies.bookId });
  return rows[0]?.bookId ?? null;
}

/**
 * Deletes a copy that no loan has ever named and returns its book id. A copy with loan history
 * stays, so the history keeps its copy, and the result is null.
 */
export async function deleteCopyRecord(copyId: string) {
  const db = await getDb();
  const rows = await db.all<{ book_id: string }>(sql`
    DELETE FROM ${copies}
    WHERE ${copies.id} = ${copyId}
      AND NOT EXISTS (SELECT 1 FROM ${borrowRequests} WHERE ${borrowRequests.copyId} = ${copyId})
    RETURNING ${sql.identifier("book_id")}`);
  return rows[0]?.book_id ?? null;
}

/** Inserts the donor unless the name exists, and returns the row either way. */
export async function ensureDonor(name: string, motivation: string | null = null) {
  const db = await getDb();
  await db.insert(donors).values({ name, motivation }).onConflictDoNothing();
  const [donor] = await db.select().from(donors).where(eq(donors.name, name)).limit(1);
  return donor;
}

export async function createLocationRecord(data: LocationFields) {
  const db = await getDb();
  const [location] = await db
    .insert(locations)
    .values({ id: crypto.randomUUID(), ...data })
    .returning();
  return location;
}

export async function updateDonorRecord(
  id: string,
  data: { name: string; motivation: string | null },
) {
  const db = await getDb();
  const [donor] = await db
    .update(donors)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(donors.id, id))
    .returning({ id: donors.id, name: donors.name, motivation: donors.motivation });
  return donor;
}

export async function updateLocationRecord(id: string, data: LocationFields) {
  const db = await getDb();
  const [location] = await db
    .update(locations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(locations.id, id))
    .returning();
  return location;
}
