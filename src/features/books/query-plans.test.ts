import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { runSeed } from "@/lib/db/seed";
import { createTestDatabase, type TestDatabase } from "@/lib/db/test-database";
import { bookCountQuery, bookListQuery, bookWhere } from "./repository";
import type { BookFilters } from "./schemas";

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
  await runSeed(await getDb(), "seed-password");
}, 120_000);

afterAll(async () => {
  await testDb?.drop();
});

async function planOf(query: { toSQL(): { sql: string; params: unknown[] } }) {
  const { sql, params } = query.toSQL();
  const rows = await testDb.query<{ detail: string }>(`EXPLAIN QUERY PLAN ${sql}`, ...params);
  return rows.map((row) => row.detail);
}

async function plansOf(filters: BookFilters) {
  const db = await getDb();
  const where = bookWhere(filters);
  const list = bookListQuery(db, {
    where,
    userId: "user",
    limit: 50,
    offset: 0,
  });
  return [...(await planOf(list)), ...(await planOf(bookCountQuery(db, where)))];
}

const scansOf = (plan: string[]) =>
  plan.filter((step) => step.startsWith("SCAN")).map((step) => step.split(" ")[1]);

describe("catalogue query plans", () => {
  // Every table touched by a per-row lookup is reached by an index.
  // Only `books` is walked in order for an unfiltered, text or availability query.
  const indexed: Record<string, BookFilters> = {
    title: {},
    text: { search: "fisica estadistica" },
    codeSearch: { search: "CAFG.1.0" },
    category: { category: "FG" },
    subcategory: { category: "FG.1" },
    available: { availability: "available" },
    unplaced: { unplaced: "1" },
  };

  for (const [name, filters] of Object.entries(indexed)) {
    it(`reads ${name} without scanning the loan, copy, heart or category tables`, async () => {
      const scans = scansOf(await plansOf(filters));
      expect(scans.filter((table) => table !== "books")).toEqual([]);
    });
  }

  it("orders an unfiltered page by the title index", async () => {
    const db = await getDb();
    const plan = await planOf(
      bookListQuery(db, {
        where: undefined,
        userId: "user",
        limit: 50,
        offset: 0,
      }),
    );
    expect(plan[0]).toContain("SCAN books USING INDEX books_title_key_idx");
    expect(plan.join("\n")).not.toContain("TEMP B-TREE");
  });

  it("looks a code up through the book and copy code indexes", async () => {
    const plan = (await plansOf({ search: "CAFG.1.0" })).join("\n");
    expect(plan).toContain("books USING INDEX books_code_unique (code>? AND code<?)");
    expect(plan).toContain("copies USING INDEX copies_code_unique (code>? AND code<?)");
  });

  it("derives availability from the active-loan index", async () => {
    const plan = (await plansOf({ availability: "available" })).join("\n");
    expect(plan).toContain("borrow_requests USING COVERING INDEX borrow_requests_active_copy_idx");
  });

  it("scans copies only for the staff-only unlabelled filter", async () => {
    expect(scansOf(await plansOf({ unlabelled: "1" }))).toContain("copies");
  });

  it("scans books only for text search, which has a leading wildcard", async () => {
    const plan = await plansOf({ search: "fisica estadistica" });
    expect(plan.some((step) => step.startsWith("SCAN books") && !step.includes("INDEX"))).toBe(
      true,
    );
  });
});
