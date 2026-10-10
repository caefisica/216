import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { createTestDatabase, type TestDatabase } from "@/lib/db/test-database";
import { insertBook } from "@/lib/db/test-fixtures";
import * as schema from "@/lib/db/schema";
import { getLibraryCounts } from "./repository";
import { listDonorGifts } from "@/features/donors/repository";

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
  const db = await getDb();
  const [donor] = await db
    .insert(schema.donors)
    .values({ id: "donor-1", name: "Ana Donante", motivation: "Para la facultad" })
    .returning();
  const first = await insertBook({ title: "Mecánica", copies: 2 });
  const second = await insertBook({ title: "Óptica", copies: 1 });
  await db
    .update(schema.copies)
    .set({ donorId: donor.id })
    .where(
      inArray(schema.copies.id, [first.copies[0].id, first.copies[1].id, second.copies[0].id]),
    );
  await db.insert(schema.user).values({
    id: "reader-1",
    email: "reader@example.com",
    name: "Reader",
    passwordHash: "hash",
    emailVerified: true,
    createdAt: new Date(),
  });
  await db.insert(schema.borrowRequests).values({
    userId: "reader-1",
    bookId: first.id,
    copyId: first.copies[0].id,
    status: "approved",
    approvedDate: new Date(),
    dueDate: new Date("2026-10-23T00:00:00.000Z"),
  });
}, 120_000);

afterAll(async () => {
  await testDb?.drop();
});

describe("reader catalogue reads", () => {
  it("returns title, copy and currently available counts from the database", async () => {
    await expect(getLibraryCounts()).resolves.toEqual({
      titleCount: 2,
      copyCount: 3,
      availableNow: 2,
    });
  });

  it("groups donated copies by donor and keeps the donated titles", async () => {
    await expect(listDonorGifts()).resolves.toEqual({
      totalCopies: 3,
      donors: [
        expect.objectContaining({
          id: "donor-1",
          name: "Ana Donante",
          copyCount: 3,
          books: expect.arrayContaining([
            expect.objectContaining({ title: "Mecánica", copyCount: 2 }),
            expect.objectContaining({ title: "Óptica", copyCount: 1 }),
          ]),
        }),
      ],
    });
  });
});
