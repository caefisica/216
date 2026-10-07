import { sql } from "drizzle-orm";

/**
 * Qualifies an outer-query column for a correlated subquery. Drizzle omits the table name in a
 * single-table query, so an unqualified `id` would resolve to the subquery's column.
 */
export const outer = (table: string, column: string) =>
  sql`${sql.identifier(table)}.${sql.identifier(column)}`;
