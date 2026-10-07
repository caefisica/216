import { getDb } from "@/lib/db";
import { books, borrowRequests, user, userBookHearts } from "@/lib/db/schema";
import { and, eq, sql, gte, desc } from "drizzle-orm";
import { outer } from "@/lib/db/qualified";
import { publicUserColumns } from "@/features/users/repository";

export async function listPendingBorrowRequests() {
  const db = await getDb();
  return db
    .select({
      id: borrowRequests.id,
      requestDate: borrowRequests.requestDate,
      status: borrowRequests.status,
      bookId: borrowRequests.bookId,
      userId: borrowRequests.userId,
      librarianId: borrowRequests.librarianId,
      approvedDate: borrowRequests.approvedDate,
      dueDate: borrowRequests.dueDate,
      returnDate: borrowRequests.returnDate,
      notes: borrowRequests.notes,
      createdAt: borrowRequests.createdAt,
      updatedAt: borrowRequests.updatedAt,
      book: books,
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
      book: { title: books.title, author: books.author },
      user: { name: user.name, email: user.email },
    })
    .from(borrowRequests)
    .innerJoin(books, eq(borrowRequests.bookId, books.id))
    .innerJoin(user, eq(borrowRequests.userId, user.id))
    .where(eq(borrowRequests.status, "approved"))
    .orderBy(borrowRequests.dueDate);
}

export async function getBookActivity() {
  const db = await getDb();
  return db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      status: books.status,
      borrowCount:
        sql<number>`(SELECT count(*) FROM ${borrowRequests} WHERE ${borrowRequests.bookId} = ${outer("books", "id")} AND ${borrowRequests.approvedDate} IS NOT NULL)`.mapWith(
          Number,
        ),
      heartsCount:
        sql<number>`(SELECT count(*) FROM ${userBookHearts} WHERE ${userBookHearts.bookId} = ${outer("books", "id")})`.mapWith(
          Number,
        ),
    })
    .from(books);
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
      user: { name: user.name },
    })
    .from(borrowRequests)
    .leftJoin(books, eq(borrowRequests.bookId, books.id))
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
 * Approves a pending request and marks its book borrowed in one batch, only while the book is
 * available. Returns false, with nothing changed, when the request is not pending or the book is
 * not available.
 */
export async function approvePendingBorrowRequest(
  requestId: string,
  bookId: string,
  decision: { librarianId: string; approvedDate: Date; dueDate: Date },
) {
  const db = await getDb();
  const [approved] = await db.batch([
    db
      .update(borrowRequests)
      .set({ ...decision, status: "approved", updatedAt: decision.approvedDate })
      .where(
        and(
          eq(borrowRequests.id, requestId),
          eq(borrowRequests.status, "pending"),
          sql`EXISTS (SELECT 1 FROM "books" WHERE "id" = ${bookId} AND "status" = 'available')`,
        ),
      )
      .returning({ id: borrowRequests.id }),
    db
      .update(books)
      .set({ status: "borrowed", updatedAt: decision.approvedDate })
      .where(
        and(
          eq(books.id, bookId),
          eq(books.status, "available"),
          sql`EXISTS (SELECT 1 FROM "borrow_requests" WHERE "id" = ${requestId} AND "status" = 'approved' AND "approved_date" = ${decision.approvedDate.getTime()})`,
        ),
      ),
  ]);
  return approved.length > 0;
}

/**
 * Marks an approved loan returned and frees its book in one batch. A book a librarian has since
 * moved to maintenance stays there. Returns false when the loan was not approved.
 */
export async function returnApprovedLoan(requestId: string, bookId: string) {
  const db = await getDb();
  const now = new Date();
  const [, returned] = await db.batch([
    db
      .update(books)
      .set({ status: "available", updatedAt: now })
      .where(
        and(
          eq(books.id, bookId),
          eq(books.status, "borrowed"),
          sql`EXISTS (SELECT 1 FROM ${borrowRequests} WHERE ${borrowRequests.id} = ${requestId} AND ${borrowRequests.status} = 'approved')`,
        ),
      ),
    db
      .update(borrowRequests)
      .set({ status: "returned", returnDate: now, updatedAt: now })
      .where(and(eq(borrowRequests.id, requestId), eq(borrowRequests.status, "approved")))
      .returning({ id: borrowRequests.id }),
  ]);
  return returned.length > 0;
}
