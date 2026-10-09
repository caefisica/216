import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/d1";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { renderCatalogueSql } from "./seed-sql";
import * as schema from "./schema";
import register from "./seeds/catalogue.json";
import { runCatalogueSeed } from "./seeds/catalogue";
import { createTestDatabase, type TestDatabase } from "./test-database";

const WRANGLER = join(process.cwd(), "node_modules", ".bin", "wrangler");
const TABLES = ["categories", "locations", "donors", "books", "copies"];

let dir: string;
let testDb: TestDatabase;

function wrangler(...args: string[]) {
  return execFileSync(WRANGLER, ["d1", ...args, "--local", "--persist-to", dir], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function fileQuery<T>(sql: string): T[] {
  const [result] = JSON.parse(wrangler("execute", "DB", "--json", "--command", sql));
  return result.results;
}

// Timestamps default to the load time, so they differ between two loads of the same register.
async function stableColumns(table: string) {
  const columns = await testDb.query<{ name: string }>(
    `SELECT name FROM pragma_table_info('${table}') WHERE name NOT LIKE '%\\_at' ESCAPE '\\'`,
  );
  return columns.map((column) => `"${column.name}"`).join(", ");
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "216-seed-sql-"));
  testDb = await createTestDatabase();
  await runCatalogueSeed(drizzle(testDb.db, { schema }));

  wrangler("migrations", "apply", "DB");
  const file = join(dir, "catalogue.sql");
  writeFileSync(file, await renderCatalogueSql());
  wrangler("execute", "DB", "--file", file);
}, 240_000);

afterAll(async () => {
  await testDb?.drop();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe("the catalogue SQL file loaded into an empty database", () => {
  it("holds the counts of the register", () => {
    const [counts] = fileQuery<Record<string, number>>(
      `SELECT (SELECT count(*) FROM categories) AS categories,
              (SELECT count(*) FROM locations) AS locations,
              (SELECT count(*) FROM donors) AS donors,
              (SELECT count(*) FROM books) AS books,
              (SELECT count(*) FROM copies) AS copies`,
    );
    expect(counts).toEqual({
      categories: register.categories.length,
      locations: register.locations.length,
      donors: register.donors.length,
      books: register.books.length,
      copies: register.books.reduce((sum, book) => sum + book.copies.length, 0),
    });
  });

  it("holds the same rows as the local seed", async () => {
    for (const table of TABLES) {
      const columns = await stableColumns(table);
      const query = `SELECT ${columns} FROM ${table} ORDER BY id`;
      expect(fileQuery(query), table).toEqual(await testDb.query(query));
    }
  }, 60_000);

  it("loads again without adding rows", async () => {
    const file = join(dir, "again.sql");
    writeFileSync(file, await renderCatalogueSql());
    wrangler("execute", "DB", "--file", file);
    const [{ n }] = fileQuery<{ n: number }>("SELECT count(*) AS n FROM copies");
    expect(n).toBe(register.books.reduce((sum, book) => sum + book.copies.length, 0));
  }, 60_000);
});
