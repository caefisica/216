import { getDb } from "@/lib/db";
import { books, borrowRequests, copies, user, userBookHearts } from "@/lib/db/schema";
import { and, count, eq, sql, gte, desc, isNotNull } from "drizzle-orm";
import { outer } from "@/lib/db/qualified";
import { publicUserColumns } from "@/features/users/repository";
import { bookSummaryColumns } from "@/features/books/repository";
import { copyIsLendable } from "@/features/books/sql";

export async function listPendingBorrowRequests() {
  const db = await getDb();
  return db
    .select({
      id: borrowRequests.id,
      requestDate: borrowRequests.requestDate,
      status: borrowRequests.status,
      bookId: borrowRequests.bookId,
      copyId: borrowRequests.copyId,
      userId: borrowRequests.userId,
      librarianId: borrowRequests.librarianId,
      approvedDate: borrowRequests.approvedDate,
      dueDate: borrowRequests.dueDate,
      returnDate: borrowRequests.returnDate,
      notes: borrowRequests.notes,
      createdAt: borrowRequests.createdAt,
      updatedAt: borrowRequests.updatedAt,
      book: bookSummaryColumns,
      user: publicUserColumns,
    })
    .from(borrowRequests)
    .innerJoin(books, eq(borrowRequests.bookId, books.id))
    .innerJoin(user, eq(borrowRequests.userId, user.id))
    .where(eq(borrowRequests.status, "pending"))
    .orderBy(desc(borrowRequests.requestDate));
}

/** Loans that were approved and not yet returned, oldest due date first. */
export async function listActiveLoans() {
  const db = await getDb();
  return db
    .select({
      id: borrowRequests.id,
      bookId: borrowRequests.bookId,
      userId: borrowRequests.userId,
      approvedDate: borrowRequests.approvedDate,
      dueDate: borrowRequests.dueDate,
      book: { code: books.code, title: books.title, author: books.author },
      copy: { id: copies.id, code: copies.code, volume: copies.volume },
      user: { name: user.name, email: user.email },
    })
    .from(borrowRequests)
    .innerJoin(books, eq(borrowRequests.bookId, books.id))
    .innerJoin(copies, eq(borrowRequests.copyId, copies.id))
    .innerJoin(user, eq(borrowRequests.userId, user.id))
    .where(eq(borrowRequests.status, "approved"))
    .orderBy(borrowRequests.dueDate);
}

/**
 * The titles that have been borrowed or favorited, most popular first: borrows count three times
 * a favorite. Each count is one grouped pass over its table's `book_id` index, joined once.
 */
export async function getBookActivity() {
  const db = await getDb();
  const loans = db
    .select({ bookId: borrowRequests.bookId, n: count().as("loan_count") })
    .from(borrowRequests)
    .where(isNotNull(borrowRequests.approvedDate))
    .groupBy(borrowRequests.bookId)
    .as("loans");
  const hearts = db
    .select({ bookId: userBookHearts.bookId, n: count().as("heart_count") })
    .from(userBookHearts)
    .groupBy(userBookHearts.bookId)
    .as("hearts");
  const borrowCount = sql<number>`coalesce(${loans.n}, 0)`.mapWith(Number);
  const heartsCount = sql<number>`coalesce(${hearts.n}, 0)`.mapWith(Number);
  const popularityScore = sql<number>`${borrowCount} * 3 + ${heartsCount}`.mapWith(Number);
  return db
    .select({
      id: books.id,
      code: books.code,
      title: books.title,
      author: books.author,
      borrowCount,
      heartsCount,
      popularityScore,
    })
    .from(books)
    .leftJoin(loans, eq(loans.bookId, books.id))
    .leftJoin(hearts, eq(hearts.bookId, books.id))
    .where(sql`${loans.n} IS NOT NULL OR ${hearts.n} IS NOT NULL`)
    .orderBy(desc(popularityScore), books.code);
}

export async function getActiveUsers() {
  const db = await getDb();
  const borrowCount = sql<number>`(SELECT count(*) FROM ${borrowRequests} WHERE ${borrowRequests.userId} = ${outer("user", "id")} AND ${borrowRequests.approvedDate} IS NOT NULL)`;
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      borrowCount: borrowCount.mapWith(Number),
    })
    .from(user)
    .orderBy(desc(borrowCount))
    .limit(20);
}

export async function getMonthlyActivity(since: Date) {
  const db = await getDb();
  const month = sql<string>`strftime('%Y-%m', ${borrowRequests.requestDate} / 1000, 'unixepoch')`;
  return db
    .select({
      month,
      borrows: sql<number>`COUNT(*) FILTER (WHERE ${borrowRequests.approvedDate} IS NOT NULL)`,
      returns: sql<number>`COUNT(*) FILTER (WHERE ${borrowRequests.returnDate} IS NOT NULL)`,
    })
    .from(borrowRequests)
    .where(gte(borrowRequests.requestDate, since))
    .groupBy(month)
    .orderBy(month);
}

export async function listBorrowHistory(limit: number) {
  const db = await getDb();
  return db
    .select({
      id: borrowRequests.id,
      status: borrowRequests.status,
      requestDate: borrowRequests.requestDate,
      approvedDate: borrowRequests.approvedDate,
      returnDate: borrowRequests.returnDate,
      book: { title: books.title },
      copy: { code: copies.code },
      user: { name: user.name },
    })
    .from(borrowRequests)
    .leftJoin(books, eq(borrowRequests.bookId, books.id))
    .leftJoin(copies, eq(borrowRequests.copyId, copies.id))
    .leftJoin(user, eq(borrowRequests.userId, user.id))
    .orderBy(desc(borrowRequests.requestDate))
    .limit(limit);
}

/** Updates the request only while it is pending. Returns undefined when it is not. */
export async function resolvePendingBorrowRequest(
  requestId: string,
  updateData: Partial<typeof borrowRequests.$inferInsert>,
) {
  const db = await getDb();
  const [request] = await db
    .update(borrowRequests)
    .set(updateData)
    .where(and(eq(borrowRequests.id, requestId), eq(borrowRequests.status, "pending")))
    .returning();
  return request;
}

export async function getBorrowRequest(requestId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ bookId: borrowRequests.bookId, status: borrowRequests.status })
    .from(borrowRequests)
    .where(eq(borrowRequests.id, requestId))
    .limit(1);
  return row;
}

/**
 * Approves a pending request by assigning it a copy of the same title, in one statement that
 * only matches while the copy is lendable. `OR IGNORE` turns a lost race for the same copy, which
 * the unique index on active loans rejects, into "no row changed". Returns false when nothing
 * changed: the request is not pending, the copy belongs to another title, or it is not lendable.
 */
export async function approvePendingBorrowRequest(
  requestId: string,
  copyId: string,
  decision: { librarianId: string; approvedDate: Date; dueDate: Date },
) {
  const db = await getDb();
  const rows = await db.all(sql`
    UPDATE OR IGNORE ${borrowRequests}
    SET "status" = 'approved', "copy_id" = ${copyId}, "librarian_id" = ${decision.librarianId},
        "approved_date" = ${decision.approvedDate.getTime()}, "due_date" = ${decision.dueDate.getTime()},
        "updated_at" = ${decision.approvedDate.getTime()}
    WHERE "id" = ${requestId} AND "status" = 'pending'
      AND EXISTS (
        SELECT 1 FROM "copies"
        WHERE "copies"."id" = ${copyId}
          AND "copies"."book_id" = ${outer("borrow_requests", "book_id")}
          AND ${copyIsLendable})
    RETURNING "id"`);
  return rows.length > 0;
}

/** Marks an approved loan returned, which frees its copy. Returns false when it was not approved. */
export async function returnApprovedLoan(requestId: string) {
  const db = await getDb();
  const now = new Date();
  const returned = await db
    .update(borrowRequests)
    .set({ status: "returned", returnDate: now, updatedAt: now })
    .where(and(eq(borrowRequests.id, requestId), eq(borrowRequests.status, "approved")))
    .returning({ id: borrowRequests.id });
  return returned.length > 0;
}
