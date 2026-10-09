import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { createTestDatabase, type TestDatabase } from "@/lib/db/test-database";
import { insertBook } from "@/lib/db/test-fixtures";
import * as schema from "@/lib/db/schema";
import { createBorrowRequestService } from "@/features/books/service";
import { getBookActivity, getMonthlyActivity, listActiveLoans } from "./repository";
import { returnLoanService, updateBorrowStatusService } from "./service";

// Revalidation needs a Next.js request.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
  const db = await getDb();
  await db.insert(schema.user).values(
    ["ana", "ben", "lib"].map((id) => ({
      id,
      email: `${id}@x.test`,
      name: id,
      passwordHash: "h",
      createdAt: new Date(),
    })),
  );
}, 120_000);

afterAll(async () => {
  await testDb?.drop();
});

type Status = "present" | "maintenance" | "missing";

/** Defines a title with one copy per status, numbered in that order. */
async function newBook(...statuses: Status[]) {
  const book = await insertBook({
    copies: (statuses.length ? statuses : ["present" as const]).map((status) => ({ status })),
  });
  return { bookId: book.id, copyIds: book.copies.map((copy) => copy.id) };
}

async function requestsFor(bookId: string) {
  return testDb.query<{ id: string; status: string; notes: string | null; copy_id: string | null }>(
    "SELECT id, status, notes, copy_id FROM borrow_requests WHERE book_id = ? ORDER BY created_at, id",
    bookId,
  );
}

async function activeLoansOn(copyId: string) {
  return testDb.query(
    "SELECT id FROM borrow_requests WHERE copy_id = ? AND status = 'approved'",
    copyId,
  );
}

async function copyStatus(copyId: string) {
  const [row] = await testDb.query<{ status: string }>(
    "SELECT status FROM copies WHERE id = ?",
    copyId,
  );
  return row.status;
}

describe("requesting a loan", () => {
  it("stores a pending request with the note and no copy yet", async () => {
    const { bookId } = await newBook();
    await createBorrowRequestService(bookId, "ana", "for class");

    expect(await requestsFor(bookId)).toMatchObject([
      { status: "pending", notes: "for class", copy_id: null },
    ]);
  });

  it("refuses a second pending request from the same user, but not from another", async () => {
    const { bookId } = await newBook();
    await createBorrowRequestService(bookId, "ana", null);

    await expect(createBorrowRequestService(bookId, "ana", null)).rejects.toThrow(
      "Ya tienes una solicitud pendiente",
    );
    await createBorrowRequestService(bookId, "ben", null);
    expect(await requestsFor(bookId)).toHaveLength(2);
  });

  it("accepts requests from several users while one copy can still be lent", async () => {
    const { bookId } = await newBook("present", "present");
    await Promise.all(["ana", "ben"].map((id) => createBorrowRequestService(bookId, id, null)));
    expect(await requestsFor(bookId)).toHaveLength(2);
  });

  it("keeps one pending request when the same user asks many times at once", async () => {
    const { bookId } = await newBook();

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => createBorrowRequestService(bookId, "ana", null)),
    );

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await requestsFor(bookId)).toHaveLength(1);
  });

  it("stores nothing when many users ask at once for a title with no copy to lend", async () => {
    const { bookId } = await newBook("maintenance", "missing");

    const results = await Promise.allSettled(
      ["ana", "ben", "lib"].flatMap((id) =>
        Array.from({ length: 3 }, () => createBorrowRequestService(bookId, id, null)),
      ),
    );

    expect(results.every((r) => r.status === "rejected")).toBe(true);
    expect(await requestsFor(bookId)).toHaveLength(0);
  });

  it("stores a request exactly for the callers that were told it was accepted, while the last copy is taken", async () => {
    const { bookId, copyIds } = await newBook();
    await createBorrowRequestService(bookId, "lib", null);
    const [taken] = await requestsFor(bookId);

    const [, ...results] = await Promise.allSettled([
      updateBorrowStatusService(taken.id, "approved", "lib"),
      ...["ana", "ben"].flatMap((id) =>
        Array.from({ length: 3 }, () => createBorrowRequestService(bookId, id, null)),
      ),
    ]);

    const accepted = results.filter((r) => r.status === "fulfilled").length;
    const pending = (await requestsFor(bookId)).filter((r) => r.status === "pending");
    expect(pending).toHaveLength(accepted);
    expect(accepted).toBeLessThanOrEqual(2);
    expect(await activeLoansOn(copyIds[0])).toHaveLength(1);
  });

  it("lets a user ask again once the earlier request is decided", async () => {
    const { bookId } = await newBook();
    await createBorrowRequestService(bookId, "ana", null);
    const [first] = await requestsFor(bookId);
    await updateBorrowStatusService(first.id, "rejected", "lib");

    await createBorrowRequestService(bookId, "ana", null);

    expect((await requestsFor(bookId)).map((r) => r.status).sort()).toEqual([
      "pending",
      "rejected",
    ]);
  });

  it.each([["maintenance"], ["missing"]] as const)(
    "refuses a title whose only copy is %s",
    async (status) => {
      const { bookId } = await newBook(status);
      await expect(createBorrowRequestService(bookId, "ana", null)).rejects.toThrow(
        "El libro no está disponible.",
      );
      expect(await requestsFor(bookId)).toHaveLength(0);
    },
  );

  it("refuses a title without copies", async () => {
    const { id } = await insertBook({ copies: 0 });
    await expect(createBorrowRequestService(id, "ana", null)).rejects.toThrow(
      "El libro no está disponible.",
    );
  });

  it("refuses a title whose only copy is on loan", async () => {
    const { bookId } = await newBook();
    await createBorrowRequestService(bookId, "ana", null);
    const [request] = await requestsFor(bookId);
    await updateBorrowStatusService(request.id, "approved", "lib");

    await expect(createBorrowRequestService(bookId, "ben", null)).rejects.toThrow(
      "El libro no está disponible.",
    );
  });

  it("refuses a book that does not exist", async () => {
    await expect(createBorrowRequestService(crypto.randomUUID(), "ana", null)).rejects.toThrow(
      "Libro no encontrado.",
    );
  });
});

describe("deciding a loan", () => {
  it("approving without a choice takes the lowest-numbered copy that can be lent, due in 14 days", async () => {
    const { bookId, copyIds } = await newBook("maintenance", "present", "present");
    await createBorrowRequestService(bookId, "ana", null);
    const [request] = await requestsFor(bookId);

    await updateBorrowStatusService(request.id, "approved", "lib");

    expect(await activeLoansOn(copyIds[1])).toHaveLength(1);
    const [row] = await testDb.query<{
      status: string;
      librarian_id: string;
      copy_id: string;
      days: number;
    }>(
      "SELECT status, librarian_id, copy_id, round((due_date - approved_date) / 86400000.0) AS days FROM borrow_requests WHERE id = ?",
      request.id,
    );
    expect(row).toEqual({ status: "approved", librarian_id: "lib", copy_id: copyIds[1], days: 14 });
  });

  it("approving with a chosen copy gives that copy", async () => {
    const { bookId, copyIds } = await newBook("present", "present");
    await createBorrowRequestService(bookId, "ana", null);
    const [request] = await requestsFor(bookId);

    await updateBorrowStatusService(request.id, "approved", "lib", copyIds[1]);

    expect((await requestsFor(bookId))[0].copy_id).toBe(copyIds[1]);
  });

  it("refuses a chosen copy of another title", async () => {
    const { bookId } = await newBook();
    const other = await newBook();
    await createBorrowRequestService(bookId, "ana", null);
    const [request] = await requestsFor(bookId);

    await expect(
      updateBorrowStatusService(request.id, "approved", "lib", other.copyIds[0]),
    ).rejects.toThrow("El ejemplar no está disponible");

    expect((await requestsFor(bookId))[0]).toMatchObject({ status: "pending", copy_id: null });
    expect(await activeLoansOn(other.copyIds[0])).toHaveLength(0);
  });

  it("rejecting leaves the copy free", async () => {
    const { bookId, copyIds } = await newBook();
    await createBorrowRequestService(bookId, "ana", null);
    const [request] = await requestsFor(bookId);

    await updateBorrowStatusService(request.id, "rejected", "lib");

    expect((await requestsFor(bookId))[0].status).toBe("rejected");
    expect(await activeLoansOn(copyIds[0])).toHaveLength(0);
  });

  it("refuses to decide a request twice", async () => {
    const { bookId, copyIds } = await newBook();
    await createBorrowRequestService(bookId, "ana", null);
    const [request] = await requestsFor(bookId);
    await updateBorrowStatusService(request.id, "rejected", "lib");

    await expect(updateBorrowStatusService(request.id, "approved", "lib")).rejects.toThrow(
      "ya fue resuelta",
    );
    expect(await activeLoansOn(copyIds[0])).toHaveLength(0);
    expect((await requestsFor(bookId))[0].status).toBe("rejected");
  });

  it("approves only one of two requests for a title with one copy", async () => {
    const { bookId } = await newBook();
    await createBorrowRequestService(bookId, "ana", null);
    await createBorrowRequestService(bookId, "ben", null);
    const [first, second] = await requestsFor(bookId);

    await updateBorrowStatusService(first.id, "approved", "lib");
    await expect(updateBorrowStatusService(second.id, "approved", "lib")).rejects.toThrow(
      "Ningún ejemplar de este libro está disponible",
    );

    expect((await requestsFor(bookId)).map((r) => r.status).sort()).toEqual([
      "approved",
      "pending",
    ]);
  });

  it("lends two copies of one title to two readers", async () => {
    const { bookId, copyIds } = await newBook("present", "present");
    await createBorrowRequestService(bookId, "ana", null);
    await createBorrowRequestService(bookId, "ben", null);
    const [first, second] = await requestsFor(bookId);

    await updateBorrowStatusService(first.id, "approved", "lib");
    await updateBorrowStatusService(second.id, "approved", "lib");

    expect((await requestsFor(bookId)).map((r) => r.copy_id).sort()).toEqual([...copyIds].sort());
  });

  it("leaves the request pending when the chosen copy leaves the shelf between the check and the update", async () => {
    const { bookId, copyIds } = await newBook("maintenance");
    const db = await getDb();
    const [request] = await db
      .insert(schema.borrowRequests)
      .values({ userId: "ana", bookId, status: "pending" })
      .returning();

    await expect(
      updateBorrowStatusService(request.id, "approved", "lib", copyIds[0]),
    ).rejects.toThrow("El ejemplar no está disponible");

    expect((await requestsFor(bookId))[0].status).toBe("pending");
    expect(await copyStatus(copyIds[0])).toBe("maintenance");
  });

  it("approves two simultaneous decisions on the last copy only once", async () => {
    const { bookId, copyIds } = await newBook();
    const db = await getDb();
    const requests = await db
      .insert(schema.borrowRequests)
      .values([
        { userId: "ana", bookId, status: "pending" },
        { userId: "ben", bookId, status: "pending" },
      ])
      .returning();

    const results = await Promise.allSettled(
      requests.map((r) => updateBorrowStatusService(r.id, "approved", "lib", copyIds[0])),
    );

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await requestsFor(bookId)).map((r) => r.status).sort()).toEqual([
      "approved",
      "pending",
    ]);
    expect(await activeLoansOn(copyIds[0])).toHaveLength(1);
  });

  it("refuses a request that does not exist", async () => {
    await expect(updateBorrowStatusService(crypto.randomUUID(), "approved", "lib")).rejects.toThrow(
      "no existe",
    );
  });
});

async function approvedLoan(...statuses: Status[]) {
  const { bookId, copyIds } = await newBook(...statuses);
  await createBorrowRequestService(bookId, "ana", null);
  const [request] = await requestsFor(bookId);
  await updateBorrowStatusService(request.id, "approved", "lib");
  return { bookId, copyIds, requestId: request.id };
}

describe("returning a loan", () => {
  it("frees the copy and records the return date", async () => {
    const { copyIds, requestId } = await approvedLoan();
    const before = Date.now();

    await returnLoanService(requestId);

    expect(await activeLoansOn(copyIds[0])).toHaveLength(0);
    const [row] = await testDb.query<{ status: string; return_date: number; copy_id: string }>(
      "SELECT status, return_date, copy_id FROM borrow_requests WHERE id = ?",
      requestId,
    );
    expect(row.status).toBe("returned");
    expect(row.return_date).toBeGreaterThanOrEqual(before);
    expect(row.copy_id).toBe(copyIds[0]);
  });

  it("lets the next reader borrow the title again", async () => {
    const { bookId, requestId } = await approvedLoan();
    await returnLoanService(requestId);

    await createBorrowRequestService(bookId, "ben", null);
    expect((await requestsFor(bookId)).map((r) => r.status).sort()).toEqual([
      "pending",
      "returned",
    ]);
  });

  it("refuses to return a loan twice", async () => {
    const { requestId } = await approvedLoan();
    await returnLoanService(requestId);

    await expect(returnLoanService(requestId)).rejects.toThrow("ya fue devuelto");
  });

  it.each(["pending", "rejected"] as const)("refuses a request that is %s", async (decision) => {
    const { bookId } = await newBook();
    await createBorrowRequestService(bookId, "ana", null);
    const [request] = await requestsFor(bookId);
    if (decision === "rejected") await updateBorrowStatusService(request.id, "rejected", "lib");

    await expect(returnLoanService(request.id)).rejects.toThrow("ya fue devuelto");
    expect((await requestsFor(bookId))[0].status).toBe(decision);
  });

  it("refuses a loan that does not exist", async () => {
    await expect(returnLoanService(crypto.randomUUID())).rejects.toThrow("no existe");
  });

  it("leaves a copy in maintenance in maintenance", async () => {
    const { bookId, copyIds, requestId } = await approvedLoan();
    await testDb.db
      .prepare("UPDATE copies SET status = 'maintenance' WHERE id = ?")
      .bind(copyIds[0])
      .run();

    await returnLoanService(requestId);

    expect(await copyStatus(copyIds[0])).toBe("maintenance");
    expect((await requestsFor(bookId))[0].status).toBe("returned");
  });

  it("lists a loan as active until it is returned, with the copy it holds", async () => {
    const { copyIds, requestId } = await approvedLoan();
    const active = (await listActiveLoans()).find((loan) => loan.id === requestId);
    expect(active?.copy.id).toBe(copyIds[0]);

    await returnLoanService(requestId);
    expect((await listActiveLoans()).map((loan) => loan.id)).not.toContain(requestId);
  });

  it("still counts a returned loan as a borrow, and counts the return", async () => {
    const { bookId, requestId } = await approvedLoan();
    await returnLoanService(requestId);

    const activity = (await getBookActivity()).find((book) => book.id === bookId);
    expect(activity?.borrowCount).toBe(1);

    const month = await getMonthlyActivity(new Date(Date.now() - 24 * 60 * 60 * 1000));
    expect(month.reduce((sum, m) => sum + Number(m.returns), 0)).toBeGreaterThanOrEqual(1);
  });
});
