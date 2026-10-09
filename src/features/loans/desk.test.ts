import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { eq } from "drizzle-orm";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { createTestDatabase, type TestDatabase } from "@/lib/db/test-database";
import { insertBook } from "@/lib/db/test-fixtures";
import * as schema from "@/lib/db/schema";
import LoansPage from "@/app/admin/loans/page";
import { activeLoansQuery, loanCountsStatement, pendingRequestsQuery } from "./repository";
import { DESK_PAGE_SIZE } from "./schemas";
import { getDeskService } from "./service";

// Client components read the router, which needs a mounted Next.js app.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

// Session cookies need a Next.js request, so the session lookup is the only fake.
vi.mock("@/features/auth/core/session", () => ({
  getCurrentSession: async () => ({
    session: { id: "s", userId: "lib", expiresAt: new Date(Date.now() + 60_000) },
    user: {
      id: "lib",
      email: "lib@x.test",
      name: "lib",
      emailVerified: true,
      role: "librarian",
    },
  }),
}));

const CONTEXT = Symbol.for("__cloudflare-context__");
const SEED_TIMEOUT = 60_000;
const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-09T15:00:00.000Z");
const daysFromNow = (days: number) => new Date(now.getTime() + days * DAY);

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
  const db = await getDb();
  await db.insert(schema.user).values(
    ["ana", "ben", "lib"].map((id) => ({
      id,
      email: `${id}@x.test`,
      name: `Lector ${id}`,
      passwordHash: "h",
      emailVerified: true,
      createdAt: new Date(),
    })),
  );
}, 120_000);

afterAll(async () => {
  await testDb?.drop();
});

beforeEach(async () => {
  await testDb.db.prepare("DELETE FROM borrow_requests").run();
});

async function recordStatements(run: () => Promise<unknown>) {
  const context = (globalThis as Record<symbol, { env: { DB: D1Database } }>)[CONTEXT];
  const { env } = context;
  const statements: string[] = [];
  context.env = {
    ...env,
    DB: new Proxy(env.DB, {
      get(target, property) {
        const value = Reflect.get(target, property);
        if (property === "prepare") {
          return (sql: string) => {
            statements.push(sql);
            return target.prepare(sql);
          };
        }
        return typeof value === "function" ? value.bind(target) : value;
      },
    }),
  };
  try {
    await run();
  } finally {
    context.env = env;
  }
  return statements;
}

async function requestsPage(page: number) {
  const desk = await getDeskService("requests", page, now);
  if (desk.view !== "requests") throw new Error(`Expected the requests view, got ${desk.view}`);
  return desk;
}

/** D1 allows 100 bound variables per statement, so a long queue goes in a few at a time. */
async function requestAll(rows: (typeof schema.borrowRequests.$inferInsert)[]) {
  const db = await getDb();
  for (let start = 0; start < rows.length; start += 10) {
    await db.insert(schema.borrowRequests).values(rows.slice(start, start + 10));
  }
}

async function request(
  bookId: string,
  values: Partial<typeof schema.borrowRequests.$inferInsert> = {},
) {
  const db = await getDb();
  const [row] = await db
    .insert(schema.borrowRequests)
    .values({ userId: "ana", bookId, ...values })
    .returning();
  return row;
}

async function lend(
  book: Awaited<ReturnType<typeof insertBook>>,
  copyIndex: number,
  dueDate: Date,
  userId = "ana",
) {
  return request(book.id, {
    userId,
    copyId: book.copies[copyIndex].id,
    status: "approved",
    approvedDate: daysFromNow(-14),
    dueDate,
  });
}

describe("the request queue", () => {
  it("lists pending requests oldest first and leaves out decided ones", async () => {
    const [a, b, c, d] = await Promise.all([1, 2, 3, 4].map((n) => insertBook({ title: `L${n}` })));
    await request(a.id, { userId: "ana", requestDate: daysFromNow(-1) });
    await request(b.id, { userId: "ana", requestDate: daysFromNow(-5) });
    await request(c.id, { userId: "ben", requestDate: daysFromNow(-3) });
    await request(d.id, {
      userId: "ben",
      requestDate: daysFromNow(-9),
      status: "rejected",
      rejectionReason: "No",
    });

    const desk = await requestsPage(1);

    expect(desk.items.map((item) => item.book.title)).toEqual(["L2", "L3", "L1"]);
    expect(desk.counts).toMatchObject({ pending: 3 });
  });

  it("offers the lendable copies of each title, lowest number first, with their place", async () => {
    const db = await getDb();
    const [bay] = await db
      .insert(schema.locations)
      .values({ cabinet: "Estante", shelf: 2, bay: 3 })
      .returning();
    const book = await insertBook({
      copies: [
        { status: "present", locationId: bay.id },
        { status: "maintenance" },
        { status: "present" },
        { status: "missing" },
        { status: "present" },
      ],
    });
    await lend(book, 2, daysFromNow(3), "ben");
    await request(book.id, { userId: "ana" });

    const { items } = await requestsPage(1);

    expect(items).toHaveLength(1);
    expect(items[0].lendableCopies.map((copy) => copy.code)).toEqual([
      book.copies[0].code,
      book.copies[4].code,
    ]);
    expect(items[0].lendableCopies[0]).toMatchObject({
      number: 1,
      location: { cabinet: "Estante", shelf: 2, bay: 3 },
    });
    expect(items[0].lendableCopies[1].location).toBeNull();
  });

  it("gives a request for a title with nothing to lend an empty list", async () => {
    const book = await insertBook({ copies: [{ status: "maintenance" }] });
    await request(book.id);

    const { items } = await requestsPage(1);

    expect(items[0].lendableCopies).toEqual([]);
  });

  it("carries the reader and the note, and never a password hash", async () => {
    const book = await insertBook();
    await request(book.id, { userId: "ben", notes: "para el lunes" });

    const { items } = await requestsPage(1);

    expect(items[0]).toMatchObject({
      reader: { name: "Lector ben", email: "ben@x.test" },
      note: "para el lunes",
    });
    expect(JSON.stringify(items)).not.toContain("passwordHash");
  });
});

describe("the loan list", () => {
  it("puts overdue loans first, the longest overdue at the top, then by due date", async () => {
    const books = await Promise.all([1, 2, 3, 4].map((n) => insertBook({ title: `P${n}` })));
    await lend(books[0], 0, daysFromNow(5));
    await lend(books[1], 0, daysFromNow(-3));
    await lend(books[2], 0, daysFromNow(-10));
    await lend(books[3], 0, daysFromNow(1));

    const desk = await getDeskService("loans", 1, now);

    expect(desk.items.map((item) => item.book.title)).toEqual(["P3", "P2", "P4", "P1"]);
    expect(desk.counts).toMatchObject({ active: 4, overdue: 2 });
  });

  it("drops a loan once it is returned", async () => {
    const book = await insertBook();
    const loan = await lend(book, 0, daysFromNow(-1));
    const db = await getDb();
    await db
      .update(schema.borrowRequests)
      .set({ status: "returned", returnDate: now })
      .where(eq(schema.borrowRequests.id, loan.id));

    const desk = await getDeskService("loans", 1, now);

    expect(desk.items).toEqual([]);
    expect(desk.counts).toMatchObject({ active: 0, overdue: 0 });
  });
});

describe("paging", () => {
  async function queue(size: number) {
    const books = await Promise.all(Array.from({ length: size }, () => insertBook()));
    await requestAll(
      books.map((book, index) => ({
        userId: "ana",
        bookId: book.id,
        requestDate: daysFromNow(-size + index),
      })),
    );
    return books;
  }

  it(
    "splits a queue into pages in order and clamps a page past the end",
    async () => {
      const books = await queue(DESK_PAGE_SIZE + 5);

      const first = await requestsPage(1);
      const second = await requestsPage(2);
      const beyond = await requestsPage(99);

      expect(first.items).toHaveLength(DESK_PAGE_SIZE);
      expect(second.items).toHaveLength(5);
      expect(second.items.map((item) => item.book.id)).toEqual(
        books.slice(DESK_PAGE_SIZE).map((book) => book.id),
      );
      expect(beyond).toMatchObject({ page: 2, pageCount: 2, total: DESK_PAGE_SIZE + 5 });
      expect(beyond.items).toHaveLength(5);
    },
    SEED_TIMEOUT,
  );

  it("shows page 1 of an empty view", async () => {
    expect(await getDeskService("loans", 7, now)).toMatchObject({
      page: 1,
      pageCount: 1,
      total: 0,
      items: [],
    });
  });

  it.each([1, DESK_PAGE_SIZE])(
    "runs the same number of statements for a page of %i requests",
    async (size) => {
      await queue(size);

      const statements = await recordStatements(() => getDeskService("requests", 1, now));

      expect(statements).toHaveLength(2);
    },
    SEED_TIMEOUT,
  );
});

describe("query plans", () => {
  const dialect = new SQLiteSyncDialect();

  async function planOf(query: { toSQL(): { sql: string; params: unknown[] } }) {
    const { sql, params } = query.toSQL();
    const rows = await testDb.query<{ detail: string }>(`EXPLAIN QUERY PLAN ${sql}`, ...params);
    return rows.map((row) => row.detail);
  }

  it("reads the queue through the pending index and sorts only the copies of one title", async () => {
    const plan = await planOf(pendingRequestsQuery(await getDb(), { limit: 25, offset: 0 }));
    const text = plan.join("\n");

    expect(plan[0]).toBe("SCAN borrow_requests USING INDEX borrow_requests_queue_idx");
    expect(plan.filter((step) => step.includes("TEMP B-TREE"))).toEqual([
      "USE TEMP B-TREE FOR json_group_array(ORDER BY)",
    ]);
    expect(text).toContain("SEARCH books USING INDEX sqlite_autoindex_books_1 (id=?)");
    expect(text).toContain(
      "SEARCH copies USING INDEX copies_book_status_idx (book_id=? AND status=?)",
    );
    expect(text).toContain("borrow_requests_active_copy_idx (copy_id=?)");
    expect(plan.filter((step) => step.startsWith("SCAN"))).toHaveLength(1);
  });

  it("reads the loans through the due-date index without sorting", async () => {
    const plan = await planOf(activeLoansQuery(await getDb(), { limit: 25, offset: 0 }));

    expect(plan[0]).toBe("SCAN borrow_requests USING INDEX borrow_requests_due_idx");
    expect(plan.join("\n")).not.toContain("TEMP B-TREE");
    expect(plan.filter((step) => step.startsWith("SCAN"))).toHaveLength(1);
  });

  it("counts every view from a partial index", async () => {
    const { sql, params } = dialect.sqlToQuery(loanCountsStatement(now));
    const rows = await testDb.query<{ detail: string }>(`EXPLAIN QUERY PLAN ${sql}`, ...params);
    const plan = rows.map((row) => row.detail);

    const onLoans = plan.filter((step) => step.includes("borrow_requests"));
    expect(onLoans).toHaveLength(3);
    expect(onLoans.every((step) => step.includes("USING COVERING INDEX"))).toBe(true);
    expect(onLoans).toContain(
      "SEARCH borrow_requests USING COVERING INDEX borrow_requests_due_idx (due_date<?)",
    );
  });
});

describe("the desk page", () => {
  async function html(searchParams: Record<string, string> = {}) {
    const page = await LoansPage({ searchParams: Promise.resolve(searchParams) });
    return renderToStaticMarkup(createElement(() => page));
  }

  it("labels every control by the title it acts on and preselects the first copy", async () => {
    const book = await insertBook({ title: "Física General", copies: 2 });
    await request(book.id);

    const page = await html();

    expect(page).toContain("<h1");
    expect(page).toContain('aria-current="page"');
    expect(page).toContain("<caption");
    expect(page).toContain("Ejemplar para Física General");
    expect(page).toContain("Ejemplar para Física General a nombre de Lector ana");
    expect(page).toContain('aria-label="Aprobar Física General a nombre de Lector ana"');
    expect(page).toContain('aria-label="Rechazar Física General a nombre de Lector ana"');
    const options = [...page.matchAll(/<option value="[^"]+"( selected="")?>([^<]+)</g)];
    expect(options.map((option) => option[2])).toEqual([
      expect.stringContaining(book.copies[0].code),
      expect.stringContaining(book.copies[1].code),
    ]);
    expect(options.map((option) => option[1] === ' selected=""')).toEqual([true, false]);
  });

  it("marks an overdue loan with words, not only a color", async () => {
    const late = await insertBook({ title: "Atrasado" });
    const fine = await insertBook({ title: "Al día" });
    await lend(late, 0, new Date(Date.now() - 4 * DAY));
    await lend(fine, 0, new Date(Date.now() + 4 * DAY));

    const page = await html({ view: "loans" });

    expect(page.indexOf("Atrasado")).toBeLessThan(page.indexOf("Al día"));
    expect(page).toMatch(/Vencido hace 4 días/);
    expect(page).toContain("1 vencido<");
    expect(page).not.toContain("1 vencidos");
    expect(page).toContain('aria-label="Devolver Atrasado a nombre de Lector ana"');
  });

  it("counts overdue loans in the plural", async () => {
    const books = await Promise.all([insertBook(), insertBook()]);
    await lend(books[0], 0, new Date(Date.now() - 2 * DAY));
    await lend(books[1], 0, new Date(Date.now() - 3 * DAY), "ben");

    expect(await html({ view: "loans" })).toContain("2 vencidos<");
  });
  it("says so when the queue is empty and falls back to the default view for a bad parameter", async () => {
    const page = await html({ view: "nope", page: "-3" });

    expect(page).toContain("No hay solicitudes pendientes.");
  });

  it(
    "links the pager to the same view",
    async () => {
      const books = await Promise.all(
        Array.from({ length: DESK_PAGE_SIZE + 1 }, () => insertBook()),
      );
      await requestAll(books.map((book) => ({ userId: "ana", bookId: book.id })));

      const page = await html({ page: "2" });

      expect(page).toContain("26–26 de 26");
      expect(page).toContain('href="/admin/loans?view=requests"');
    },
    SEED_TIMEOUT,
  );
});
