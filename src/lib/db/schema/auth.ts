import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const Role = ["user", "librarian", "admin", "suspended"] as const;
export type Role = (typeof Role)[number];

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  role: text("role").$type<Role>().notNull().default("user"),
  totalDonations: real("total_donations").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

export const emailVerificationRequest = sqliteTable("email_verification_request", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

export const passwordResetSession = sqliteTable("password_reset_session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});
