import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { createTestDatabase, type TestDatabase } from "@/lib/db/test-database";
import { insertBook } from "@/lib/db/test-fixtures";
import * as schema from "@/lib/db/schema";
import type { Role } from "@/lib/db/schema";
import { createBorrowRequestService } from "@/features/books/service";
import { listUserActivity } from "@/features/users/repository";
import { getBookActivity, getMonthlyActivity } from "@/features/admin/repository";
import { approveRequest, rejectRequest, returnLoan } from "./actions";
import { RejectionReasonSchema } from "./schemas";

// Revalidation needs a Next.js request.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

// Session cookies need a Next.js request, so the session lookup is the only fake.
const caller = vi.hoisted(() => ({ id: "lib", role: "librarian" as Role }));

vi.mock("@/features/auth/core/session", () => ({
  getCurrentSession: async () => ({
    session: { id: "s", userId: caller.id, expiresAt: new Date(Date.now() + 60_000) },
    user: {
      id: caller.id,
      email: `${caller.id}@x.test`,
      name: caller.id,
      emailVerified: true,
      role: caller.role,
    },
  }),
}));

/** Starts `call` as the user. The action reads the session before its first await, so calls started back to back keep their own caller. */
function as<T>(id: string, call: () => Promise<T>, role: Role = "librarian") {
  caller.id = id;
  caller.role = role;
  return call();
}

const approve = (requestId: string, copyId: string, by = "lib") =>
  as(by, () => approveRequest({ requestId, copyId }));
const reject = (requestId: string, reason: string, by = "lib") =>
  as(by, () => rejectRequest({ requestId, reason }));
const giveBack = (requestId: string, by = "lib") => as(by, () => returnLoan({ requestId }));

const failure = (message: string) => ({
  ok: false,
  error: { code: "failed", message: expect.stringContaining(message) },
});
const succeeded = { ok: true, value: undefined };

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
  const db = await getDb();
  await db.insert(schema.user).values(
    ["ana", "ben", "lib", "lib2"].map((id) => ({
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
  return testDb.query<{
    id: string;
    status: string;
    notes: string | null;
    copy_id: string | null;
    librarian_id: string | null;
    rejection_reason: string | null;
  }>(
    "SELECT id, status, notes, copy_id, librarian_id, rejection_reason FROM borrow_requests WHERE book_id = ? ORDER BY created_at, id",
    bookId,
  );
}

async function pendingRequest(bookId: string, userId = "ana") {
  await createBorrowRequestService(bookId, userId, null);
  const [request] = await testDb.query<{ id: string }>(
    "SELECT id FROM borrow_requests WHERE book_id = ? AND user_id = ? AND status = 'pending'",
    bookId,
    userId,
  );
  return request.id;
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
    const taken = await pendingRequest(bookId, "lib");

    const [, ...results] = await Promise.allSettled([
      approve(taken, copyIds[0]),
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
    await reject(await pendingRequest(bookId), "No hoy");

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
    const { bookId, copyIds } = await newBook();
    await approve(await pendingRequest(bookId), copyIds[0]);

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

describe("approving a request", () => {
  it("binds the chosen copy, due in 14 days, and records the librarian", async () => {
    const { bookId, copyIds } = await newBook("present", "present");
    const requestId = await pendingRequest(bookId);

    expect(await approve(requestId, copyIds[1], "lib2")).toEqual(succeeded);

    const [row] = await testDb.query<{
      status: string;
      librarian_id: string;
      copy_id: string;
      days: number;
    }>(
      "SELECT status, librarian_id, copy_id, round((due_date - approved_date) / 86400000.0) AS days FROM borrow_requests WHERE id = ?",
      requestId,
    );
    expect(row).toEqual({
      status: "approved",
      librarian_id: "lib2",
      copy_id: copyIds[1],
      days: 14,
    });
    expect(await activeLoansOn(copyIds[0])).toHaveLength(0);
  });

  it("lends two copies of one title to two readers", async () => {
    const { bookId, copyIds } = await newBook("present", "present");
    const first = await pendingRequest(bookId, "ana");
    const second = await pendingRequest(bookId, "ben");

    expect(await approve(first, copyIds[0])).toEqual(succeeded);
    expect(await approve(second, copyIds[1])).toEqual(succeeded);

    expect((await requestsFor(bookId)).map((r) => r.copy_id).sort()).toEqual([...copyIds].sort());
  });

  it("refuses a copy that belongs to another title", async () => {
    const { bookId } = await newBook();
    const other = await newBook();
    const requestId = await pendingRequest(bookId);

    expect(await approve(requestId, other.copyIds[0])).toEqual(failure("ya no está disponible"));

    expect((await requestsFor(bookId))[0]).toMatchObject({ status: "pending", copy_id: null });
    expect(await activeLoansOn(other.copyIds[0])).toHaveLength(0);
  });

  it.each([["maintenance"], ["missing"]] as const)(
    "refuses a copy that is %s and leaves the request pending",
    async (status) => {
      const { bookId, copyIds } = await newBook("present", status);
      const requestId = await pendingRequest(bookId);

      expect(await approve(requestId, copyIds[1])).toEqual(failure("ya no está disponible"));

      expect((await requestsFor(bookId))[0].status).toBe("pending");
      expect(await copyStatus(copyIds[1])).toBe(status);
    },
  );

  it("refuses a copy another reader already holds, and the request can take another copy", async () => {
    const { bookId, copyIds } = await newBook("present", "present");
    const first = await pendingRequest(bookId, "ana");
    const second = await pendingRequest(bookId, "ben");
    await approve(first, copyIds[0]);

    expect(await approve(second, copyIds[0])).toEqual(failure("ya no está disponible"));
    expect(await approve(second, copyIds[1])).toEqual(succeeded);
  });

  it("refuses a request that was already decided", async () => {
    const { bookId, copyIds } = await newBook();
    const requestId = await pendingRequest(bookId);
    await reject(requestId, "No hoy");

    expect(await approve(requestId, copyIds[0])).toEqual(failure("ya fue resuelta"));
    expect(await activeLoansOn(copyIds[0])).toHaveLength(0);
    expect((await requestsFor(bookId))[0].status).toBe("rejected");
  });

  it("refuses a request that does not exist", async () => {
    const { copyIds } = await newBook();
    expect(await approve(crypto.randomUUID(), copyIds[0])).toEqual(failure("no existe"));
  });

  it("lets only one of two librarians who pick the same copy for different requests win", async () => {
    const { bookId, copyIds } = await newBook("present", "present");
    const first = await pendingRequest(bookId, "ana");
    const second = await pendingRequest(bookId, "ben");

    const [byLib, byLib2] = await Promise.all([
      approve(first, copyIds[0], "lib"),
      approve(second, copyIds[0], "lib2"),
    ]);

    const outcomes = [byLib, byLib2];
    expect(outcomes.filter((result) => result.ok)).toHaveLength(1);
    expect(outcomes.filter((result) => !result.ok)).toEqual([failure("ya no está disponible")]);
    expect(await activeLoansOn(copyIds[0])).toHaveLength(1);

    const loser = byLib.ok ? second : first;
    expect((await requestsFor(bookId)).find((r) => r.id === loser)?.status).toBe("pending");
    expect(await approve(loser, copyIds[1])).toEqual(succeeded);
    expect(await activeLoansOn(copyIds[1])).toHaveLength(1);
  });

  it("keeps one loan when two librarians approve the same request with different copies", async () => {
    const { bookId, copyIds } = await newBook("present", "present");
    const requestId = await pendingRequest(bookId);

    const results = await Promise.all([
      approve(requestId, copyIds[0], "lib"),
      approve(requestId, copyIds[1], "lib2"),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const held =
      (await activeLoansOn(copyIds[0])).length + (await activeLoansOn(copyIds[1])).length;
    expect(held).toBe(1);
  });

  it("ends in one decision when one librarian approves and another rejects the same request", async () => {
    const { bookId, copyIds } = await newBook();
    const requestId = await pendingRequest(bookId);

    const results = await Promise.all([
      approve(requestId, copyIds[0], "lib"),
      reject(requestId, "No hoy", "lib2"),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const [row] = await requestsFor(bookId);
    if (row.status === "approved") {
      expect(row).toMatchObject({ copy_id: copyIds[0], rejection_reason: null });
    } else {
      expect(row).toMatchObject({ status: "rejected", copy_id: null });
      expect(await activeLoansOn(copyIds[0])).toHaveLength(0);
    }
  });

  it("refuses a reader before it reads the input", async () => {
    const { bookId, copyIds } = await newBook();
    const requestId = await pendingRequest(bookId);

    const result = await as("ana", () => approveRequest({ requestId, copyId: copyIds[0] }), "user");

    expect(result).toMatchObject({ ok: false, error: { code: "forbidden" } });
    expect((await requestsFor(bookId))[0].status).toBe("pending");
  });
});

describe("rejecting a request", () => {
  it("stores the reason and the librarian, and leaves the copy free", async () => {
    const { bookId, copyIds } = await newBook();
    const requestId = await pendingRequest(bookId);

    expect(await reject(requestId, "  Solo se presta en sala  ", "lib2")).toEqual(succeeded);

    expect((await requestsFor(bookId))[0]).toMatchObject({
      status: "rejected",
      librarian_id: "lib2",
      rejection_reason: "Solo se presta en sala",
      copy_id: null,
    });
    expect(await activeLoansOn(copyIds[0])).toHaveLength(0);
    await createBorrowRequestService(bookId, "ben", null);
  });

  it("shows the reader the reason", async () => {
    const { bookId } = await newBook();
    await reject(await pendingRequest(bookId, "ben"), "Ya tienes tres libros");

    const history = await listUserActivity("ben");
    expect(history.find((entry) => entry.bookId === bookId)).toMatchObject({
      status: "rejected",
      rejectionReason: "Ya tienes tres libros",
    });
  });

  it.each([[""], ["   "], ["x".repeat(301)]])("refuses the reason %j", async (reason) => {
    const { bookId } = await newBook();
    const requestId = await pendingRequest(bookId);

    expect(await reject(requestId, reason)).toMatchObject({
      ok: false,
      error: { code: "invalid" },
    });
    expect((await requestsFor(bookId))[0].status).toBe("pending");
  });

  it("trims the reason, and the form shows the schema's message for an empty one", () => {
    expect(RejectionReasonSchema.parse("  No hoy  ")).toBe("No hoy");
    const empty = RejectionReasonSchema.safeParse("   ");
    expect(empty.success).toBe(false);
    expect(empty.error?.issues[0].message).toBe("El motivo no puede estar vacío");
  });

  it("refuses to decide a request twice", async () => {
    const { bookId } = await newBook();
    const requestId = await pendingRequest(bookId);
    await reject(requestId, "No hoy");

    expect(await reject(requestId, "Otra vez")).toEqual(failure("ya fue resuelta"));
    expect((await requestsFor(bookId))[0].rejection_reason).toBe("No hoy");
  });

  it("refuses a request that does not exist", async () => {
    expect(await reject(crypto.randomUUID(), "No hoy")).toEqual(failure("no existe"));
  });

  it.each([[undefined], [""], ["   "]])(
    "is refused by the database for a rejected row with the reason %j",
    async (rejectionReason) => {
      const { bookId } = await newBook();
      const db = await getDb();
      await expect(
        db
          .insert(schema.borrowRequests)
          .values({ userId: "ana", bookId, status: "rejected", rejectionReason }),
      ).rejects.toThrow();
    },
  );

  it("is accepted by the database for a rejected row with a reason", async () => {
    const { bookId } = await newBook();
    const db = await getDb();
    await db
      .insert(schema.borrowRequests)
      .values({ userId: "ana", bookId, status: "rejected", rejectionReason: "No hoy" });
    expect((await requestsFor(bookId))[0].status).toBe("rejected");
  });
});

async function approvedLoan(...statuses: Status[]) {
  const { bookId, copyIds } = await newBook(...statuses);
  const requestId = await pendingRequest(bookId);
  await approve(requestId, copyIds[0]);
  return { bookId, copyIds, requestId };
}

describe("returning a loan", () => {
  it("frees the copy and records the return date", async () => {
    const { copyIds, requestId } = await approvedLoan();
    const before = Date.now();

    expect(await giveBack(requestId)).toEqual(succeeded);

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
    await giveBack(requestId);

    await createBorrowRequestService(bookId, "ben", null);
    expect((await requestsFor(bookId)).map((r) => r.status).sort()).toEqual([
      "pending",
      "returned",
    ]);
  });

  it("returns a loan once when two librarians press return together", async () => {
    const { requestId } = await approvedLoan();

    const results = await Promise.all([giveBack(requestId, "lib"), giveBack(requestId, "lib2")]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([failure("ya fue devuelto")]);
  });

  it.each(["pending", "rejected"] as const)("refuses a request that is %s", async (decision) => {
    const { bookId } = await newBook();
    const requestId = await pendingRequest(bookId);
    if (decision === "rejected") await reject(requestId, "No hoy");

    expect(await giveBack(requestId)).toEqual(failure("ya fue devuelto o no estaba vigente"));
    expect((await requestsFor(bookId))[0].status).toBe(decision);
  });

  it("refuses a loan that does not exist", async () => {
    expect(await giveBack(crypto.randomUUID())).toEqual(failure("no existe"));
  });

  it("leaves a copy in maintenance in maintenance", async () => {
    const { bookId, copyIds, requestId } = await approvedLoan();
    await testDb.db
      .prepare("UPDATE copies SET status = 'maintenance' WHERE id = ?")
      .bind(copyIds[0])
      .run();

    expect(await giveBack(requestId)).toEqual(succeeded);

    expect(await copyStatus(copyIds[0])).toBe("maintenance");
    expect((await requestsFor(bookId))[0].status).toBe("returned");
  });

  it("still counts a returned loan as a borrow, and counts the return", async () => {
    const { bookId, requestId } = await approvedLoan();
    await giveBack(requestId);

    const activity = (await getBookActivity()).find((book) => book.id === bookId);
    expect(activity?.borrowCount).toBe(1);

    const month = await getMonthlyActivity(new Date(Date.now() - 24 * 60 * 60 * 1000));
    expect(month.reduce((sum, m) => sum + Number(m.returns), 0)).toBeGreaterThanOrEqual(1);
  });
});
