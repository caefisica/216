import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "./index";
import * as schema from "./schema";
import { runDemoSeed } from "./seeds/demo";
import { createTestDatabase, type TestDatabase } from "./test-database";
import { insertBook } from "./test-fixtures";

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
  const db = await getDb();
  await db.insert(schema.user).values(
    ["u1", "u2", "u3"].map((id) => ({
      id,
      email: `${id}@example.com`,
      passwordHash: "x",
      name: id,
      createdAt: new Date(),
    })),
  );
}, 120_000);

afterAll(async () => {
  await testDb?.drop();
});

describe("migrations", () => {
  it("let the database fill in ids and timestamps the app does not set", async () => {
    const before = Date.now();
    const book = await insertBook();

    expect(book.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(book.createdAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(book.createdAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    expect(book.copies[0]).toMatchObject({
      origin: "original",
      status: "present",
      pieces: 1,
      labelled: true,
    });
  });

  it("delete a user's sessions with the user", async () => {
    const db = await getDb();
    await db.insert(schema.user).values({
      id: "gone",
      email: "gone@example.com",
      passwordHash: "x",
      name: "G",
      createdAt: new Date(),
    });
    await db.insert(schema.session).values({ id: "s1", userId: "gone", expiresAt: new Date() });

    await db.delete(schema.user).where(eq(schema.user.id, "gone"));

    expect(await testDb.query("SELECT id FROM session")).toEqual([]);
  });
});

describe("copy constraints", () => {
  it("reject a status, origin, condition or piece count the library does not use", async () => {
    const book = await insertBook({ copies: 0 });
    const db = await getDb();
    const bad = (override: Record<string, unknown>) =>
      db
        .insert(schema.copies)
        .values({ bookId: book.id, number: 1, code: `${book.code}.1`, ...override } as never);

    await expect(bad({ status: "lost" })).rejects.toThrow();
    await expect(bad({ origin: "borrowed" })).rejects.toThrow();
    await expect(bad({ condition: "mint" })).rejects.toThrow();
    await expect(bad({ pieces: 0 })).rejects.toThrow();
  });

  it("refuse two copies with the same number or code", async () => {
    const book = await insertBook({ copies: 1 });
    const db = await getDb();

    await expect(
      db.insert(schema.copies).values({ bookId: book.id, number: 1, code: `${book.code}.9` }),
    ).rejects.toThrow();
    await expect(
      db.insert(schema.copies).values({ bookId: book.id, number: 2, code: `${book.code}.1` }),
    ).rejects.toThrow();
  });

  it("delete a title's copies, hearts and loans with the title", async () => {
    const book = await insertBook({ copies: 2 });
    const db = await getDb();
    await db.insert(schema.userBookHearts).values({ userId: "u1", bookId: book.id });
    await db.insert(schema.borrowRequests).values({
      userId: "u1",
      bookId: book.id,
      copyId: book.copies[0].id,
      status: "approved",
    });

    await db.delete(schema.books).where(eq(schema.books.id, book.id));

    for (const table of ["copies", "user_book_hearts", "borrow_requests"]) {
      expect(
        await testDb.query(`SELECT 1 FROM ${table} WHERE book_id = ?`, book.id),
        table,
      ).toEqual([]);
    }
  });
});

describe("loan constraints", () => {
  it("refuse an approved or returned loan without a copy", async () => {
    const book = await insertBook();
    const db = await getDb();

    for (const status of ["approved", "returned"]) {
      await expect(
        db.insert(schema.borrowRequests).values({ userId: "u1", bookId: book.id, status }),
        status,
      ).rejects.toThrow();
    }
    await db.insert(schema.borrowRequests).values({ userId: "u1", bookId: book.id });
  });

  it("refuse a copy of another title", async () => {
    const mine = await insertBook();
    const theirs = await insertBook();
    const db = await getDb();

    await expect(
      db.insert(schema.borrowRequests).values({
        userId: "u1",
        bookId: mine.id,
        copyId: theirs.copies[0].id,
        status: "approved",
      }),
    ).rejects.toThrow();
  });

  it("refuse a second approved loan on the same copy, and allow it once the first is returned", async () => {
    const book = await insertBook();
    const copyId = book.copies[0].id;
    const db = await getDb();
    const loan = (userId: string, status: string) =>
      db.insert(schema.borrowRequests).values({ userId, bookId: book.id, copyId, status });

    await loan("u1", "approved");
    await expect(loan("u2", "approved")).rejects.toThrow();

    await db
      .update(schema.borrowRequests)
      .set({ status: "returned" })
      .where(eq(schema.borrowRequests.copyId, copyId));
    await loan("u2", "approved");
  });

  it("keep a copy that a loan names", async () => {
    const book = await insertBook();
    const db = await getDb();
    await db.insert(schema.borrowRequests).values({
      userId: "u1",
      bookId: book.id,
      copyId: book.copies[0].id,
      status: "returned",
    });

    await expect(
      db.delete(schema.copies).where(eq(schema.copies.id, book.copies[0].id)),
    ).rejects.toThrow();
  });
});

describe("demo seed", () => {
  it("can run twice without duplicating accounts", async () => {
    const db = await getDb();
    await runDemoSeed(db, "seed-password");
    await runDemoSeed(db, "seed-password");

    const [{ users }] = await testDb.query<{ users: number }>(
      "SELECT count(*) AS users FROM user WHERE email LIKE '%@unmsm.edu.pe'",
    );
    expect(users).toBe(3);
  });
});

describe("queries", () => {
  it("search books regardless of letter case and accents", async () => {
    await insertBook({ title: "Introducción a la Física", author: "Ñandú" });
    const { listBooks } = await import("@/features/books/repository");

    expect((await listBooks({ search: "INTRODUCCION fisica" })).items.map((b) => b.title)).toEqual([
      "Introducción a la Física",
    ]);
    expect((await listBooks({ search: "nandu" })).items.map((b) => b.title)).toEqual([
      "Introducción a la Física",
    ]);
  });

  describe("loan activity", () => {
    let bookId: string;

    beforeAll(async () => {
      const db = await getDb();
      const book = await insertBook({ copies: 3 });
      bookId = book.id;
      const [one, two, three] = book.copies.map((copy) => copy.id);
      const loan = (
        copyId: string,
        values: Partial<typeof schema.borrowRequests.$inferInsert>,
      ) => ({ userId: "u3", bookId, copyId, ...values });
      await db.insert(schema.borrowRequests).values([
        loan(one, {
          status: "approved",
          requestDate: new Date("2020-03-10T12:00:00Z"),
          approvedDate: new Date("2020-03-11T12:00:00Z"),
        }),
        loan(two, {
          status: "returned",
          requestDate: new Date("2020-03-20T12:00:00Z"),
          approvedDate: new Date("2020-03-21T12:00:00Z"),
          returnDate: new Date("2020-03-25T12:00:00Z"),
        }),
        loan(three, {
          status: "approved",
          requestDate: new Date("2020-04-02T12:00:00Z"),
          approvedDate: new Date("2020-04-03T12:00:00Z"),
        }),
      ]);
      await db.insert(schema.userBookHearts).values({ userId: "u2", bookId });
    });

    it("groups by calendar month", async () => {
      const { getMonthlyActivity } = await import("@/features/admin/repository");
      const months = await getMonthlyActivity(new Date("2020-01-01T00:00:00Z"));

      expect(months.filter((row) => row.month < "2021")).toEqual([
        { month: "2020-03", borrows: 2, returns: 1 },
        { month: "2020-04", borrows: 1, returns: 0 },
      ]);
    });

    it("counts a book's approved loans, returned ones included, and hearts", async () => {
      const { getBookActivity } = await import("@/features/admin/repository");
      const activity = await getBookActivity();

      expect(activity.find((row) => row.id === bookId)).toMatchObject({
        borrowCount: 3,
        heartsCount: 1,
      });
    });

    it("ranks users by approved loans, returned ones included", async () => {
      const { getActiveUsers } = await import("@/features/admin/repository");
      const users = await getActiveUsers();

      expect(users.find((row) => row.id === "u3")?.borrowCount).toBe(3);
      expect(users.find((row) => row.id === "u2")?.borrowCount).toBe(0);
    });
  });
});
