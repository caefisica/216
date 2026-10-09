import { derivedTitleColumns } from "@/features/books/search";
import type { Database } from "../index";
import * as schema from "../schema";
import register from "./catalogue.json";
import { stableId } from "./ids";

export interface RegisterCopy {
  number: number;
  origin: schema.CopyOrigin;
  volume?: string;
  pieces: number;
  edition?: string;
  year?: number;
  country?: string;
  publisher?: string;
  location?: string;
  donor?: string;
  status: schema.CopyStatus;
  condition?: schema.CopyCondition;
  labelled: boolean;
  notes?: string;
}

export interface Register {
  categories: { code: string; name: string; parent?: string; next?: number }[];
  locations: {
    cabinet: string;
    shelf: number;
    bay: number;
    category: string;
    holds: schema.LocationHolds;
  }[];
  donors: string[];
  books: {
    code: string;
    category: string;
    title: string;
    author?: string;
    copies: RegisterCopy[];
  }[];
}

// D1 allows 100 bound parameters per statement.
const PARAMETER_LIMIT = 100;

export type SeedStatement = ReturnType<ReturnType<Database["insert"]>["values"]>;

function insertAll<T extends Record<string, unknown>>(
  db: Database,
  table: Parameters<Database["insert"]>[0],
  rows: T[],
): SeedStatement[] {
  if (rows.length === 0) return [];
  const size = Math.max(1, Math.floor(PARAMETER_LIMIT / Object.keys(rows[0]).length));
  const statements: SeedStatement[] = [];
  for (let start = 0; start < rows.length; start += size) {
    statements.push(
      db
        .insert(table)
        .values(rows.slice(start, start + size) as never)
        .onConflictDoNothing() as never,
    );
  }
  return statements;
}

/**
 * Loads the librarians' register into an empty or partly loaded catalogue. Every id comes from
 * the row's code or name and every insert skips rows that exist, so a second run adds nothing
 * and keeps later edits.
 */
export async function runCatalogueSeed(db: Database, data: Register = register as Register) {
  await db.batch((await catalogueStatements(db, data)) as never);
}

/**
 * The inserts of the register in dependency order. `db` only builds them: the local seed runs
 * them and `db:seed:sql` renders them, so both load the same rows.
 */
export async function catalogueStatements(
  db: Database,
  data: Register = register as Register,
): Promise<SeedStatement[]> {
  const statements: SeedStatement[] = [];
  const categoryId = new Map<string, string>();
  for (const category of data.categories) {
    categoryId.set(category.code, await stableId(`category:${category.code}`));
  }
  statements.push(
    ...insertAll(
      db,
      schema.categories,
      data.categories.map((category) => ({
        id: categoryId.get(category.code)!,
        parentId: category.parent ? categoryId.get(category.parent)! : null,
        code: category.code,
        name: category.name,
        nextNumber: category.next ?? 1,
      })),
    ),
  );

  const locationId = new Map<string, string>();
  const locationRows = [];
  for (const location of data.locations) {
    const place = `${location.cabinet}/${location.shelf}/${location.bay}`;
    const id = await stableId(`location:${place}`);
    locationId.set(place, id);
    locationRows.push({
      id,
      cabinet: location.cabinet,
      shelf: location.shelf,
      bay: location.bay,
      categoryId: categoryId.get(location.category)!,
      holds: location.holds,
    });
  }
  statements.push(...insertAll(db, schema.locations, locationRows));

  const donorId = new Map<string, string>();
  for (const name of data.donors) donorId.set(name, await stableId(`donor:${name}`));
  statements.push(
    ...insertAll(
      db,
      schema.donors,
      data.donors.map((name) => ({ id: donorId.get(name)!, name })),
    ),
  );

  const bookRows = [];
  const copyRows = [];
  for (const book of data.books) {
    const id = await stableId(`book:${book.code}`);
    bookRows.push({
      id,
      code: book.code,
      categoryId: categoryId.get(book.category)!,
      title: book.title,
      author: book.author ?? null,
      ...derivedTitleColumns(book.title, book.author ?? null),
      nextCopy: Math.max(...book.copies.map((copy) => copy.number)) + 1,
    });
    for (const copy of book.copies) {
      copyRows.push({
        id: await stableId(`copy:${book.code}.${copy.number}`),
        bookId: id,
        number: copy.number,
        code: `${book.code}.${copy.number}`,
        origin: copy.origin,
        volume: copy.volume ?? null,
        pieces: copy.pieces,
        edition: copy.edition ?? null,
        year: copy.year ?? null,
        country: copy.country ?? null,
        publisher: copy.publisher ?? null,
        locationId: copy.location ? locationId.get(copy.location)! : null,
        donorId: copy.donor ? donorId.get(copy.donor)! : null,
        status: copy.status,
        condition: copy.condition ?? null,
        labelled: copy.labelled,
        notes: copy.notes ?? null,
      });
    }
  }
  statements.push(
    ...insertAll(db, schema.books, bookRows),
    ...insertAll(db, schema.copies, copyRows),
  );
  return statements;
}
