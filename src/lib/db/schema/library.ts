import {
  sqliteTable,
  text,
  integer,
  check,
  foreignKey,
  index,
  unique,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";
import { timestampNow, uuidPrimaryKey } from "./columns";

/** Keep each list in step with the check constraint of the same column below. */
export const CopyOrigin = ["original", "copy"] as const;
export type CopyOrigin = (typeof CopyOrigin)[number];

export const CopyStatus = ["present", "maintenance", "missing"] as const;
export type CopyStatus = (typeof CopyStatus)[number];

export const CopyCondition = ["good", "fair", "poor"] as const;
export type CopyCondition = (typeof CopyCondition)[number];

export const LocationHolds = ["primary", "extra"] as const;
export type LocationHolds = (typeof LocationHolds)[number];

const inList = (column: unknown, values: readonly string[]) =>
  sql`${column} IN (${sql.raw(values.map((value) => `'${value}'`).join(", "))})`;

/**
 * Two levels: a top-level category has no parent, a subcategory has one. Books live in leaf
 * categories. `nextNumber` is the book number the next title of a leaf takes.
 */
export const categories = sqliteTable(
  "categories",
  {
    id: uuidPrimaryKey(),
    parentId: text("parent_id").references((): AnySQLiteColumn => categories.id, {
      onDelete: "restrict",
    }),
    code: text("code").unique().notNull(),
    name: text("name").notNull(),
    nextNumber: integer("next_number").default(1).notNull(),
    createdAt: timestampNow("created_at"),
    updatedAt: timestampNow("updated_at"),
  },
  (table) => [
    index("categories_parent_idx").on(table.parentId),
    // Code searches compare against uppercase ranges, which can then use the code indexes.
    check("categories_code_check", sql`${table.code} = upper(${table.code})`),
  ],
);

/**
 * A title. `search` is the title and author lowercased with accents removed, which SQLite's
 * ASCII-only `LIKE` can match. `titleKey` is the title in the same form without leading
 * punctuation: it orders the list in the database, where a Spanish collation does not exist.
 * `nextCopy` is the number the next copy of the title takes.
 */
export const books = sqliteTable(
  "books",
  {
    id: uuidPrimaryKey(),
    code: text("code").unique().notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    author: text("author"),
    search: text("search").notNull(),
    titleKey: text("title_key").notNull(),
    isbn: text("isbn").unique(),
    description: text("description"),
    imageUrl: text("image_url"),
    nextCopy: integer("next_copy").default(1).notNull(),
    createdAt: timestampNow("created_at"),
    updatedAt: timestampNow("updated_at"),
  },
  (table) => [
    index("books_category_idx").on(table.categoryId),
    index("books_title_key_idx").on(table.titleKey, table.code),
  ],
);

/** A bay of a cabinet, labelled for one category. `holds` says which copies the bay is for. */
export const locations = sqliteTable(
  "locations",
  {
    id: uuidPrimaryKey(),
    cabinet: text("cabinet").notNull(),
    shelf: integer("shelf").notNull(),
    bay: integer("bay").notNull(),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    holds: text("holds").$type<LocationHolds>().default("primary").notNull(),
    createdAt: timestampNow("created_at"),
    updatedAt: timestampNow("updated_at"),
  },
  (table) => [
    unique("locations_place_unique").on(table.cabinet, table.shelf, table.bay),
    check("locations_holds_check", inList(table.holds, LocationHolds)),
  ],
);

/** A donor is a credit line. It holds no contact data. */
export const donors = sqliteTable("donors", {
  id: uuidPrimaryKey(),
  name: text("name").unique().notNull(),
  motivation: text("motivation"),
  createdAt: timestampNow("created_at"),
  updatedAt: timestampNow("updated_at"),
});

/**
 * One physical item with one code, one place and one state. `pieces` counts the parts under the
 * code, such as a two-volume set. `code` is the book's code, a dot and `number`.
 */
export const copies = sqliteTable(
  "copies",
  {
    id: uuidPrimaryKey(),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    code: text("code").unique().notNull(),
    origin: text("origin").$type<CopyOrigin>().default("original").notNull(),
    volume: text("volume"),
    pieces: integer("pieces").default(1).notNull(),
    edition: text("edition"),
    year: integer("year"),
    country: text("country"),
    publisher: text("publisher"),
    locationId: text("location_id").references(() => locations.id, { onDelete: "set null" }),
    donorId: text("donor_id").references(() => donors.id, { onDelete: "set null" }),
    status: text("status").$type<CopyStatus>().default("present").notNull(),
    condition: text("condition").$type<CopyCondition>(),
    labelled: integer("labelled", { mode: "boolean" }).default(true).notNull(),
    notes: text("notes"),
    createdAt: timestampNow("created_at"),
    updatedAt: timestampNow("updated_at"),
  },
  (table) => [
    unique("copies_book_number_unique").on(table.bookId, table.number),
    // The target of the loan's composite foreign key, which keeps a loan from naming another title's copy.
    unique("copies_book_id_unique").on(table.bookId, table.id),
    index("copies_location_idx").on(table.locationId),
    index("copies_donor_idx").on(table.donorId),
    check("copies_origin_check", inList(table.origin, CopyOrigin)),
    check("copies_status_check", inList(table.status, CopyStatus)),
    check(
      "copies_condition_check",
      sql`${table.condition} IS NULL OR ${inList(table.condition, CopyCondition)}`,
    ),
    check("copies_pieces_check", sql`${table.pieces} >= 1`),
  ],
);

export const userBookHearts = sqliteTable(
  "user_book_hearts",
  {
    id: uuidPrimaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    createdAt: timestampNow("created_at"),
  },
  (table) => [
    uniqueIndex("user_book_hearts_user_book_idx").on(table.userId, table.bookId),
    index("user_book_hearts_book_idx").on(table.bookId),
  ],
);

/**
 * A reader requests a title; staff pick the copy when they approve, so `copyId` is null until
 * then. The composite foreign key keeps the copy a copy of the requested title.
 */
export const borrowRequests = sqliteTable(
  "borrow_requests",
  {
    id: uuidPrimaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    copyId: text("copy_id"),
    requestDate: timestampNow("request_date"),
    status: text("status").default("pending").notNull(),
    librarianId: text("librarian_id").references(() => user.id, { onDelete: "set null" }),
    approvedDate: integer("approved_date", { mode: "timestamp_ms" }),
    dueDate: integer("due_date", { mode: "timestamp_ms" }),
    returnDate: integer("return_date", { mode: "timestamp_ms" }),
    notes: text("notes"),
    createdAt: timestampNow("created_at"),
    updatedAt: timestampNow("updated_at"),
  },
  (table) => [
    index("borrow_requests_user_idx").on(table.userId, table.requestDate),
    index("borrow_requests_book_idx").on(table.bookId),
    index("borrow_requests_date_idx").on(table.requestDate),
    foreignKey({
      columns: [table.bookId, table.copyId],
      foreignColumns: [copies.bookId, copies.id],
      name: "borrow_requests_copy_fk",
    }),
    check(
      "borrow_requests_status_check",
      sql`${table.status} IN ('pending', 'approved', 'rejected', 'returned')`,
    ),
    check(
      "borrow_requests_copy_check",
      sql`${table.status} NOT IN ('approved', 'returned') OR ${table.copyId} IS NOT NULL`,
    ),
    // A user has at most one pending request per book, however many arrive at once.
    uniqueIndex("borrow_requests_pending_idx")
      .on(table.bookId, table.userId)
      .where(sql`${table.status} = 'pending'`),
    // A copy is on at most one loan at a time, however many approvals arrive at once.
    uniqueIndex("borrow_requests_active_copy_idx")
      .on(table.copyId)
      .where(sql`${table.status} = 'approved'`),
  ],
);

export const bookImages = sqliteTable(
  "book_images",
  {
    id: uuidPrimaryKey(),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    isCover: integer("is_cover", { mode: "boolean" }).default(false).notNull(),
    altText: text("alt_text"),
    displayOrder: integer("display_order").default(0).notNull(),
    createdAt: timestampNow("created_at"),
  },
  (table) => [
    // One stored object belongs to one image row, so deleting an image never removes a shared object.
    uniqueIndex("book_images_image_url_idx").on(table.imageUrl),
    index("book_images_book_idx").on(table.bookId, table.displayOrder),
  ],
);
