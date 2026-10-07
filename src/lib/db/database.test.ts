import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "./index";
import * as schema from "./schema";
import { runDemoSeed } from "./seeds/demo";
import { createTestDatabase, type TestDatabase } from "./test-database";

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
}, 120_000);

afterAll(async () => {
  await testDb?.drop();
});

describe("migrations", () => {
  it("ship the book categories", async () => {
    const rows = await testDb.query("SELECT name FROM categories ORDER BY name");
    expect(rows).toHaveLength(7);
    expect(rows).toContainEqual({ name: "Quantum Mechanics" });
  });

  it("let the database fill in ids and timestamps the app does not set", async () => {
    const before = Date.now();
    const db = await getDb();
    const [book] = await db.insert(schema.books).values({ title: "T", author: "A" }).returning();

    expect(book.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(book.createdAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(book.createdAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    expect(book.status).toBe("available");
  });

  it("reject a book status the library does not use", async () => {
    const db = await getDb();
    await expect(
      db.insert(schema.books).values({ title: "Bad", author: "A", status: "lost" }),
    ).rejects.toThrow();
  });

  it("delete a user's sessions with the user", async () => {
    const db = await getDb();
    await db.insert(schema.user).values({
      id: "u1",
      email: "u1@example.com",
      passwordHash: "x",
      name: "U",
      createdAt: new Date(),
    });
    await db.insert(schema.session).values({ id: "s1", userId: "u1", expiresAt: new Date() });

    await db.delete(schema.user);

    expect(await testDb.query("SELECT id FROM session")).toEqual([]);
  });
});

describe("demo seed", () => {
  it("can run twice without duplicating accounts or books", async () => {
    const db = await getDb();
    await runDemoSeed(db, "seed-password");
    await runDemoSeed(db, "seed-password");

    const [{ users }] = await testDb.query<{ users: number }>("SELECT count(*) AS users FROM user");
    const [{ bookCount }] = await testDb.query<{ bookCount: number }>(
      "SELECT count(*) AS bookCount FROM books WHERE isbn IS NOT NULL",
    );
    expect(users).toBe(3);
    expect(bookCount).toBe(2);
  });
});

describe("queries", () => {
  it("search books regardless of letter case", async () => {
    const { listBooks } = await import("@/features/books/repository");
    const found = await listBooks({ search: "cOsMoS" });
    expect(found.map((book) => book.title)).toEqual(["Cosmos"]);
  });

  it("group the monthly loan activity by calendar month", async () => {
    const { getMonthlyActivity } = await import("@/features/admin/repository");
    const db = await getDb();
    const [student] = await db.select().from(schema.user);
    const [book] = await db.select().from(schema.books);
    await db.insert(schema.borrowRequests).values([
      {
        userId: student.id,
        bookId: book.id,
        status: "approved",
        requestDate: new Date("2026-03-10T12:00:00Z"),
      },
      {
        userId: student.id,
        bookId: book.id,
        status: "returned",
        requestDate: new Date("2026-03-20T12:00:00Z"),
        returnDate: new Date("2026-03-25T12:00:00Z"),
      },
      {
        userId: student.id,
        bookId: book.id,
        status: "approved",
        requestDate: new Date("2026-04-02T12:00:00Z"),
      },
    ]);

    const months = await getMonthlyActivity(new Date("2026-01-01T00:00:00Z"));

    expect(months).toEqual([
      { month: "2026-03", borrows: 1, returns: 1 },
      { month: "2026-04", borrows: 1, returns: 0 },
    ]);
  });

  it("count a book's approved loans and hearts", async () => {
    const { getBookActivity } = await import("@/features/admin/repository");
    const db = await getDb();
    const [student] = await db.select().from(schema.user);
    const [book] = await db.select().from(schema.books);
    await db.insert(schema.userBookHearts).values({ userId: student.id, bookId: book.id });

    const activity = await getBookActivity();

    expect(activity.find((row) => row.id === book.id)).toMatchObject({
      borrowCount: 2,
      heartsCount: 1,
    });
    expect(activity.filter((row) => row.id !== book.id).every((row) => row.heartsCount === 0)).toBe(
      true,
    );
  });

  it("rank active users by approved loans", async () => {
    const { getActiveUsers } = await import("@/features/admin/repository");
    const users = await getActiveUsers();
    expect(users[0].borrowCount).toBe(2);
  });
});
