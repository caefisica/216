import { sql } from "drizzle-orm";
import { integer, text } from "drizzle-orm/sqlite-core";

export const uuidPrimaryKey = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

/** Milliseconds since the epoch, filled in by the database when a row is inserted. */
export const timestampNow = (name: string) =>
  integer(name, { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`);
