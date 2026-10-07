import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * One row per limited subject, shared by every Worker instance. `key` is `<limiter>:<subject>`.
 * `count` and `stampedAt` mean what the limiter that owns the row says they mean. `expiresAt` is
 * when the row stops affecting any decision, so it can be deleted.
 */
export const rateLimit = sqliteTable(
  "rate_limit",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull(),
    stampedAt: integer("stamped_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [index("rate_limit_expires_at_idx").on(table.expiresAt)],
);
