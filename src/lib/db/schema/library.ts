import { sqliteTable, text, integer, check, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";
import { timestampNow, uuidPrimaryKey } from "./columns";

export const categories = sqliteTable("categories", {
  id: uuidPrimaryKey(),
  name: text("name").unique().notNull(),
  createdAt: timestampNow("created_at"),
  updatedAt: timestampNow("updated_at"),
});

export const books = sqliteTable(
  "books",
  {
    id: uuidPrimaryKey(),
    title: text("title").notNull(),
    author: text("author").notNull(),
    isbn: text("isbn").unique(),
    description: text("description"),
    imageUrl: text("image_url"),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    status: text("status").default("available").notNull(),
    publicationYear: integer("publication_year"),
    publisher: text("publisher"),
    pages: integer("pages"),
    location: text("location"),
    createdAt: timestampNow("created_at"),
    updatedAt: timestampNow("updated_at"),
  },
  (table) => [
    check("books_status_check", sql`${table.status} IN ('available', 'borrowed', 'maintenance')`),
  ],
);

export const userBookHearts = sqliteTable("user_book_hearts", {
  id: uuidPrimaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  createdAt: timestampNow("created_at"),
});

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
    check(
      "borrow_requests_status_check",
      sql`${table.status} IN ('pending', 'approved', 'rejected', 'returned')`,
    ),
  ],
);

export const bookImages = sqliteTable("book_images", {
  id: uuidPrimaryKey(),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  isCover: integer("is_cover", { mode: "boolean" }).default(false).notNull(),
  altText: text("alt_text"),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestampNow("created_at"),
});

export const bookCategories = sqliteTable(
  "book_categories",
  {
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.bookId, table.categoryId] })],
);
