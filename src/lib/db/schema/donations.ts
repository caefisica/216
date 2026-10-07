import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { timestampNow, uuidPrimaryKey } from "./columns";

export const donors = sqliteTable("donors", {
  id: uuidPrimaryKey(),
  name: text("name").notNull(),
  motivation: text("motivation"),
  createdAt: timestampNow("created_at"),
  updatedAt: timestampNow("updated_at"),
});

export const donations = sqliteTable("donations", {
  id: uuidPrimaryKey(),
  donorId: text("donor_id")
    .notNull()
    .references(() => donors.id, { onDelete: "cascade" }),
  bookTitle: text("book_title").notNull(),
  bookAuthor: text("book_author").notNull(),
  donationDate: timestampNow("donation_date"),
  status: text("status").default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestampNow("created_at"),
  updatedAt: timestampNow("updated_at"),
});
