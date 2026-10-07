import { getDb } from "@/lib/db";
import {
  books,
  categories,
  bookImages,
  bookCategories,
  userBookHearts,
  borrowRequests,
} from "@/lib/db/schema";
import { outer } from "@/lib/db/qualified";
import { eq, or, and, sql, desc, inArray, type AnyColumn } from "drizzle-orm";
import type { BookFields, BookFilters } from "./schemas";

export async function listBooks(filters: BookFilters) {
  const db = await getDb();
  const query = db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      isbn: books.isbn,
      description: books.description,
      imageUrl: books.imageUrl,
      categoryId: books.categoryId,
      status: books.status,
      publicationYear: books.publicationYear,
      publisher: books.publisher,
      pages: books.pages,
      location: books.location,
      createdAt: books.createdAt,
      updatedAt: books.updatedAt,
      heartsCount:
        sql<number>`(SELECT count(*) FROM ${userBookHearts} WHERE ${userBookHearts.bookId} = ${outer("books", "id")})`.mapWith(
          Number,
        ),
    })
    .from(books);

  const conditions = [];
  if (filters.search) {
    const pattern = `%${filters.search.replace(/[\\%_]/g, "\\$&")}%`;
    const matches = (column: AnyColumn) => sql`${column} LIKE ${pattern} ESCAPE '\\'`;
    conditions.push(or(matches(books.title), matches(books.author), matches(books.description)));
  }
  if (filters.status && filters.status !== "all") conditions.push(eq(books.status, filters.status));
  if (filters.categoryId && filters.categoryId !== "all")
    conditions.push(eq(books.categoryId, filters.categoryId));
  if (conditions.length > 0) query.where(and(...conditions));

  return query.orderBy(desc(books.createdAt));
}

export async function listBooksByIds(bookIds: string[]) {
  const db = await getDb();
  return db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      isbn: books.isbn,
      description: books.description,
      imageUrl: books.imageUrl,
      categoryId: books.categoryId,
      status: books.status,
      publicationYear: books.publicationYear,
      publisher: books.publisher,
      pages: books.pages,
      location: books.location,
      createdAt: books.createdAt,
      updatedAt: books.updatedAt,
      heartsCount:
        sql<number>`(SELECT count(*) FROM ${userBookHearts} WHERE ${userBookHearts.bookId} = ${outer("books", "id")})`.mapWith(
          Number,
        ),
    })
    .from(books)
    .where(inArray(books.id, bookIds))
    .orderBy(desc(books.createdAt));
}

export async function listBookImages(bookIds: string[]) {
  const db = await getDb();
  return db
    .select()
    .from(bookImages)
    .where(inArray(bookImages.bookId, bookIds))
    .orderBy(bookImages.displayOrder);
}

export async function listBookImagesByBookId(bookId: string) {
  const db = await getDb();
  return db
    .select()
    .from(bookImages)
    .where(eq(bookImages.bookId, bookId))
    .orderBy(bookImages.displayOrder);
}

export async function listBookCategories(bookIds: string[]) {
  const db = await getDb();
  return db
    .select({ bookId: bookCategories.bookId, category: categories })
    .from(bookCategories)
    .innerJoin(categories, eq(bookCategories.categoryId, categories.id))
    .where(inArray(bookCategories.bookId, bookIds));
}

export async function listBookCategoriesByBookId(bookId: string) {
  const db = await getDb();
  return db
    .select({ category: categories })
    .from(bookCategories)
    .innerJoin(categories, eq(bookCategories.categoryId, categories.id))
    .where(eq(bookCategories.bookId, bookId));
}

export async function listHeartedBookIds(userId: string) {
  const db = await getDb();
  const hearts = await db
    .select({ bookId: userBookHearts.bookId })
    .from(userBookHearts)
    .where(eq(userBookHearts.userId, userId));
  return hearts.map((h) => h.bookId);
}

export async function getBookById(id: string) {
  const db = await getDb();
  const rows = await db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      isbn: books.isbn,
      description: books.description,
      imageUrl: books.imageUrl,
      categoryId: books.categoryId,
      status: books.status,
      publicationYear: books.publicationYear,
      publisher: books.publisher,
      pages: books.pages,
      location: books.location,
      createdAt: books.createdAt,
      updatedAt: books.updatedAt,
      heartsCount:
        sql<number>`(SELECT count(*) FROM ${userBookHearts} WHERE ${userBookHearts.bookId} = ${outer("books", "id")})`.mapWith(
          Number,
        ),
    })
    .from(books)
    .where(eq(books.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function hasHeart(bookId: string, userId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(userBookHearts)
    .where(and(eq(userBookHearts.bookId, bookId), eq(userBookHearts.userId, userId)))
    .limit(1);
  return rows.length > 0;
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
 * Inserts a pending request in one statement that only matches an available book, and returns
 * whether it did. It does not insert when the book is not available or the user already has a
 * pending request for it, however many requests arrive at once.
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
    FROM ${books} WHERE ${books.id} = ${bookId} AND ${books.status} = 'available'
    ON CONFLICT DO NOTHING
    RETURNING ${sql.identifier("id")}`);
  return rows.length > 0;
}

export async function listCategories() {
  const db = await getDb();
  return db.select().from(categories).orderBy(categories.name);
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
export async function addBookImageRecord(input: {
  bookId: string;
  imageUrl: string;
  isCover: boolean;
  displayOrder: number;
}) {
  const db = await getDb();
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
    .set({ ...data, updatedAt: new Date() })
    .where(eq(books.id, id))
    .returning({ id: books.id });
  return rows.length > 0;
}

export async function createBookRecord(id: string, data: BookFields) {
  const db = await getDb();
  await db.insert(books).values({ id, ...data });
}
