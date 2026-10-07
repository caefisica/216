import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { createTestDatabase, type TestDatabase } from "@/lib/db/test-database";
import * as schema from "@/lib/db/schema";
import { setHeartRecord } from "./repository";

let testDb: TestDatabase;
let bookId: string;

beforeAll(async () => {
  testDb = await createTestDatabase();
  const db = await getDb();
  await db.insert(schema.user).values(
    ["ana", "ben"].map((id) => ({
      id,
      email: `${id}@x.test`,
      name: id,
      passwordHash: "h",
      createdAt: new Date(),
    })),
  );
  [{ id: bookId }] = await db
    .insert(schema.books)
    .values({ title: "T", author: "A" })
    .returning({ id: schema.books.id });
}, 120_000);

afterAll(async () => {
  await testDb?.drop();
});

const hearts = (userId = "ana") =>
  testDb.query<{ id: string }>(
    "SELECT id FROM user_book_hearts WHERE book_id = ? AND user_id = ?",
    bookId,
    userId,
  );

describe("setting a favorite", () => {
  it("adds, then removes", async () => {
    await setHeartRecord(bookId, "ana", true);
    expect(await hearts()).toHaveLength(1);

    await setHeartRecord(bookId, "ana", false);
    expect(await hearts()).toHaveLength(0);
  });

  it("changes nothing when the user already has that state", async () => {
    await setHeartRecord(bookId, "ana", false);
    expect(await hearts()).toHaveLength(0);

    await setHeartRecord(bookId, "ana", true);
    const [before] = await hearts();
    await setHeartRecord(bookId, "ana", true);
    expect(await hearts()).toEqual([before]);
  });

  it("keeps one row per user and book however many calls arrive at once", async () => {
    await setHeartRecord(bookId, "ana", false);
    await Promise.all(Array.from({ length: 6 }, () => setHeartRecord(bookId, "ana", true)));

    expect(await hearts()).toHaveLength(1);
  });

  it("ends in the state of the last call when add and remove arrive together", async () => {
    await Promise.all([
      setHeartRecord(bookId, "ana", true),
      setHeartRecord(bookId, "ana", false),
      setHeartRecord(bookId, "ana", true),
    ]);
    expect(await hearts()).toHaveLength(1);

    await Promise.all([setHeartRecord(bookId, "ana", true), setHeartRecord(bookId, "ana", false)]);
    expect(await hearts()).toHaveLength(0);
  });

  it("leaves other users' favorites alone", async () => {
    await setHeartRecord(bookId, "ben", true);
    await setHeartRecord(bookId, "ana", false);

    expect(await hearts("ben")).toHaveLength(1);
  });

  it("ignores a book that does not exist", async () => {
    await setHeartRecord(crypto.randomUUID(), "ana", true);

    expect(
      await testDb.query("SELECT id FROM user_book_hearts WHERE book_id <> ?", bookId),
    ).toEqual([]);
  });
});
