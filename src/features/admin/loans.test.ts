import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { createTestDatabase, type TestDatabase } from "@/lib/db/test-database";
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

async function newBook(status: "available" | "borrowed" | "maintenance" = "available") {
  const db = await getDb();
  const [book] = await db
    .insert(schema.books)
    .values({ title: "T", author: "A", status })
    .returning();
  return book.id;
}

async function requestsFor(bookId: string) {
  return testDb.query<{ id: string; status: string; notes: string | null }>(
    "SELECT id, status, notes FROM borrow_requests WHERE book_id = ? ORDER BY created_at, id",
    bookId,
  );
}

async function bookStatus(bookId: string) {
  const [row] = await testDb.query<{ status: string }>(
    "SELECT status FROM books WHERE id = ?",
    bookId,
  );
  return row.status;
}

describe("requesting a loan", () => {
  it("stores a pending request with the note", async () => {
    const bookId = await newBook();
    await createBorrowRequestService(bookId, "ana", "for class");

    expect(await requestsFor(bookId)).toMatchObject([{ status: "pending", notes: "for class" }]);
    expect(await bookStatus(bookId)).toBe("available");
  });

  it("refuses a second pending request from the same user, but not from another", async () => {
    const bookId = await newBook();
    await createBorrowRequestService(bookId, "ana", null);

    await expect(createBorrowRequestService(bookId, "ana", null)).rejects.toThrow(
      "Ya tienes una solicitud pendiente",
    );
    await createBorrowRequestService(bookId, "ben", null);
    expect(await requestsFor(bookId)).toHaveLength(2);
  });

  it("keeps one pending request when the same user asks many times at once", async () => {
    const bookId = await newBook();

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => createBorrowRequestService(bookId, "ana", null)),
    );

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await requestsFor(bookId)).toHaveLength(1);
  });

  it("stores nothing when many users ask at once for a book that is not available", async () => {
    const bookId = await newBook("maintenance");

    const results = await Promise.allSettled(
      ["ana", "ben", "lib"].flatMap((id) =>
        Array.from({ length: 3 }, () => createBorrowRequestService(bookId, id, null)),
      ),
    );

    expect(results.every((r) => r.status === "rejected")).toBe(true);
    expect(await requestsFor(bookId)).toHaveLength(0);
  });

  it("stores a request exactly for the callers that were told it was accepted, while the book is taken", async () => {
    const bookId = await newBook();
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
    expect(await bookStatus(bookId)).toBe("borrowed");
  });

  it("lets a user ask again once the earlier request is decided", async () => {
    const bookId = await newBook();
    await createBorrowRequestService(bookId, "ana", null);
    const [first] = await requestsFor(bookId);
    await updateBorrowStatusService(first.id, "rejected", "lib");

    await createBorrowRequestService(bookId, "ana", null);

    expect((await requestsFor(bookId)).map((r) => r.status).sort()).toEqual([
      "pending",
      "rejected",
    ]);
  });

  it.each(["borrowed", "maintenance"] as const)("refuses a book that is %s", async (status) => {
    const bookId = await newBook(status);
    await expect(createBorrowRequestService(bookId, "ana", null)).rejects.toThrow(
      "El libro no está disponible.",
    );
    expect(await requestsFor(bookId)).toHaveLength(0);
  });

  it("refuses a book that does not exist", async () => {
    await expect(createBorrowRequestService(crypto.randomUUID(), "ana", null)).rejects.toThrow(
      "Libro no encontrado.",
    );
  });
});

describe("deciding a loan", () => {
  it("approving marks the book borrowed and sets the due date 14 days out", async () => {
    const bookId = await newBook();
    await createBorrowRequestService(bookId, "ana", null);
    const [request] = await requestsFor(bookId);

    await updateBorrowStatusService(request.id, "approved", "lib");

    expect(await bookStatus(bookId)).toBe("borrowed");
    const [row] = await testDb.query<{ status: string; librarian_id: string; days: number }>(
      "SELECT status, librarian_id, round((due_date - approved_date) / 86400000.0) AS days FROM borrow_requests WHERE id = ?",
      request.id,
    );
    expect(row).toEqual({ status: "approved", librarian_id: "lib", days: 14 });
  });

  it("rejecting leaves the book available", async () => {
    const bookId = await newBook();
    await createBorrowRequestService(bookId, "ana", null);
    const [request] = await requestsFor(bookId);

    await updateBorrowStatusService(request.id, "rejected", "lib");

    expect((await requestsFor(bookId))[0].status).toBe("rejected");
    expect(await bookStatus(bookId)).toBe("available");
  });

  it("refuses to decide a request twice", async () => {
    const bookId = await newBook();
    await createBorrowRequestService(bookId, "ana", null);
    const [request] = await requestsFor(bookId);
    await updateBorrowStatusService(request.id, "rejected", "lib");

    await expect(updateBorrowStatusService(request.id, "approved", "lib")).rejects.toThrow(
      "ya fue resuelta",
    );
    expect(await bookStatus(bookId)).toBe("available");
    expect((await requestsFor(bookId))[0].status).toBe("rejected");
  });

  it("approves only one of two requests for the same book", async () => {
    const bookId = await newBook();
    await createBorrowRequestService(bookId, "ana", null);
    await createBorrowRequestService(bookId, "ben", null);
    const [first, second] = await requestsFor(bookId);

    await updateBorrowStatusService(first.id, "approved", "lib");
    await expect(updateBorrowStatusService(second.id, "approved", "lib")).rejects.toThrow(
      "El libro no está disponible",
    );

    const statuses = (await requestsFor(bookId)).map((r) => r.status).sort();
    expect(statuses).toEqual(["approved", "pending"]);
  });

  it("leaves the request pending when the book is taken between the check and the update", async () => {
    const bookId = await newBook("maintenance");
    const db = await getDb();
    const [request] = await db
      .insert(schema.borrowRequests)
      .values({ userId: "ana", bookId, status: "pending" })
      .returning();

    await expect(updateBorrowStatusService(request.id, "approved", "lib")).rejects.toThrow(
      "El libro no está disponible",
    );

    expect((await requestsFor(bookId))[0].status).toBe("pending");
    expect(await bookStatus(bookId)).toBe("maintenance");
  });

  it("approves two simultaneous decisions on one book only once", async () => {
    const bookId = await newBook();
    const db = await getDb();
    const requests = await db
      .insert(schema.borrowRequests)
      .values([
        { userId: "ana", bookId, status: "pending" },
        { userId: "ben", bookId, status: "pending" },
      ])
      .returning();

    const results = await Promise.allSettled(
      requests.map((r) => updateBorrowStatusService(r.id, "approved", "lib")),
    );

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await requestsFor(bookId)).map((r) => r.status).sort()).toEqual([
      "approved",
      "pending",
    ]);
    expect(await bookStatus(bookId)).toBe("borrowed");
  });

  it("refuses a request that does not exist", async () => {
    await expect(updateBorrowStatusService(crypto.randomUUID(), "approved", "lib")).rejects.toThrow(
      "no existe",
    );
  });
});

async function approvedLoan(status: "available" | "maintenance" = "available") {
  const bookId = await newBook(status);
  await createBorrowRequestService(bookId, "ana", null);
  const [request] = await requestsFor(bookId);
  await updateBorrowStatusService(request.id, "approved", "lib");
  return { bookId, requestId: request.id };
}

describe("returning a loan", () => {
  it("frees the book and records the return date", async () => {
    const { bookId, requestId } = await approvedLoan();
    const before = Date.now();

    await returnLoanService(requestId);

    expect(await bookStatus(bookId)).toBe("available");
    const [row] = await testDb.query<{ status: string; return_date: number }>(
      "SELECT status, return_date FROM borrow_requests WHERE id = ?",
      requestId,
    );
    expect(row.status).toBe("returned");
    expect(row.return_date).toBeGreaterThanOrEqual(before);
  });

  it("lets the next reader borrow the book again", async () => {
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
    const bookId = await newBook();
    await createBorrowRequestService(bookId, "ana", null);
    const [request] = await requestsFor(bookId);
    if (decision === "rejected") await updateBorrowStatusService(request.id, "rejected", "lib");

    await expect(returnLoanService(request.id)).rejects.toThrow("ya fue devuelto");
    expect((await requestsFor(bookId))[0].status).toBe(decision);
  });

  it("refuses a loan that does not exist", async () => {
    await expect(returnLoanService(crypto.randomUUID())).rejects.toThrow("no existe");
  });

  it("leaves a book in maintenance in maintenance", async () => {
    const { bookId, requestId } = await approvedLoan();
    await testDb.db
      .prepare("UPDATE books SET status = 'maintenance' WHERE id = ?")
      .bind(bookId)
      .run();

    await returnLoanService(requestId);

    expect(await bookStatus(bookId)).toBe("maintenance");
    expect((await requestsFor(bookId))[0].status).toBe("returned");
  });

  it("lists a loan as active until it is returned", async () => {
    const { requestId } = await approvedLoan();
    expect((await listActiveLoans()).map((loan) => loan.id)).toContain(requestId);

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
