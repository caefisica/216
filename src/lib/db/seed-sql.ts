import { writeFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import { catalogueStatements } from "./seeds/catalogue";

const CATALOGUE_SQL_PATH = "catalogue.sql";

function literal(value: unknown) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "string") return `'${value.replaceAll("'", "''")}'`;
  throw new Error(`Cannot write ${typeof value} as an SQL literal`);
}

/**
 * The catalogue seed as one SQL file for `wrangler d1 execute --file`, which takes no bound
 * parameters. The statements come from the same code as the local seed, so both load the same
 * rows and skip rows that exist.
 */
export async function renderCatalogueSql(): Promise<string> {
  // Nothing runs against this binding: the database only builds the statements.
  const db = drizzle({} as D1Database, { schema });
  const statements = await catalogueStatements(db);
  return (
    statements
      .map((statement) => {
        const { sql, params } = statement.toSQL();
        let next = 0;
        const text = sql.replace(/\?/g, () => literal(params[next++]));
        if (next !== params.length) throw new Error("Placeholders and parameters differ");
        return `${text};`;
      })
      .join("\n") + "\n"
  );
}

if (import.meta.main) {
  renderCatalogueSql()
    .then((sql) => {
      writeFileSync(CATALOGUE_SQL_PATH, sql);
      console.log(`Wrote ${CATALOGUE_SQL_PATH}.`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
