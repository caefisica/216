import { and, asc, eq, or, sql, type SQL } from "drizzle-orm";
import { getDb, type Database } from "@/lib/db";
import { books, borrowRequests, copies, user } from "@/lib/db/schema";
import { outer } from "@/lib/db/qualified";
import { copyIsLendable } from "@/features/books/sql";
import { normalizeSearch } from "@/features/books/search";
import type { ActiveLoanRow, LendableCopy, LoanCounts, PendingRequestRow } from "./types";

const isPending = eq(borrowRequests.status, "pending");
const isApproved = eq(borrowRequests.status, "approved");

function searchCondition(query: string) {
  const value = `%${query.toLowerCase().replace(/[\\%_]/g, "\\$&")}%`;
  const normalized = `%${normalizeSearch(query).replace(/[\\%_]/g, "\\$&")}%`;
  return or(
    sql`${books.search} LIKE ${normalized} ESCAPE '\\'`,
    sql`lower(${user.name}) LIKE ${value} ESCAPE '\\'`,
    sql`lower(${user.email}) LIKE ${value} ESCAPE '\\'`,
    sql`lower(${copies.code}) LIKE ${value} ESCAPE '\\'`,
  );
}

function viewCondition(view: "requests" | "loans") {
  return view === "requests" ? isPending : isApproved;
}

interface LendableCopyJson {
  id: string;
  number: number;
  code: string;
  volume: string | null;
  cabinet: string | null;
  shelf: number | null;
  bay: number | null;
}

/**
 * The lendable copies of the request's title as JSON, read by a correlated subquery so the page
 * needs one statement. It is evaluated for the rows on the page only.
 */
const lendableCopiesOfRequest = sql<string>`(
  SELECT json_group_array(json_object(
    'id', "copies"."id", 'number', "copies"."number", 'code', "copies"."code",
    'volume', "copies"."volume", 'cabinet', "locations"."cabinet",
    'shelf', "locations"."shelf", 'bay', "locations"."bay")
    ORDER BY "copies"."number")
  FROM "copies" LEFT JOIN "locations" ON "locations"."id" = "copies"."location_id"
  WHERE "copies"."book_id" = ${outer("borrow_requests", "book_id")} AND ${copyIsLendable})`;

function parseLendableCopies(json: string): LendableCopy[] {
  return (JSON.parse(json) as LendableCopyJson[]).map(({ cabinet, shelf, bay, ...copy }) => ({
    ...copy,
    location: cabinet !== null && shelf !== null && bay !== null ? { cabinet, shelf, bay } : null,
  }));
}

/** Pending requests, oldest first, each with the copies that can be lent. */
export function pendingRequestsQuery(
  db: Database,
  page: { limit: number; offset: number },
  query = "",
) {
  return db
    .select({
      id: borrowRequests.id,
      requestDate: borrowRequests.requestDate,
      note: borrowRequests.notes,
      book: { id: books.id, code: books.code, title: books.title, author: books.author },
      reader: { name: user.name, email: user.email },
      lendableCopies: lendableCopiesOfRequest,
    })
    .from(borrowRequests)
    .innerJoin(books, eq(borrowRequests.bookId, books.id))
    .innerJoin(user, eq(borrowRequests.userId, user.id))
    .leftJoin(copies, eq(borrowRequests.copyId, copies.id))
    .where(query ? and(isPending, searchCondition(query)) : isPending)
    .orderBy(asc(borrowRequests.requestDate), asc(borrowRequests.id))
    .limit(page.limit)
    .offset(page.offset);
}

export async function listPendingRequests(
  page: {
    limit: number;
    offset: number;
  },
  query = "",
): Promise<PendingRequestRow[]> {
  const rows = await pendingRequestsQuery(await getDb(), page, query);
  return rows.map(({ lendableCopies, ...row }) => ({
    ...row,
    lendableCopies: parseLendableCopies(lendableCopies),
  }));
}

/** Approved loans by due date, so the overdue ones come first. */
export function activeLoansQuery(
  db: Database,
  page: { limit: number; offset: number },
  query = "",
) {
  return db
    .select({
      id: borrowRequests.id,
      approvedDate: borrowRequests.approvedDate,
      dueDate: borrowRequests.dueDate,
      book: { id: books.id, code: books.code, title: books.title, author: books.author },
      copy: { code: copies.code, volume: copies.volume },
      reader: { name: user.name, email: user.email },
    })
    .from(borrowRequests)
    .innerJoin(books, eq(borrowRequests.bookId, books.id))
    .innerJoin(copies, eq(borrowRequests.copyId, copies.id))
    .innerJoin(user, eq(borrowRequests.userId, user.id))
    .where(query ? and(isApproved, searchCondition(query)) : isApproved)
    .orderBy(asc(borrowRequests.dueDate), asc(borrowRequests.id))
    .limit(page.limit)
    .offset(page.offset);
}

export async function listActiveLoans(
  page: {
    limit: number;
    offset: number;
  },
  query = "",
): Promise<ActiveLoanRow[]> {
  return activeLoansQuery(await getDb(), page, query);
}

export async function countLoanView(view: "requests" | "loans", query: string) {
  const db = await getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(borrowRequests)
    .innerJoin(books, eq(borrowRequests.bookId, books.id))
    .innerJoin(user, eq(borrowRequests.userId, user.id))
    .leftJoin(copies, eq(borrowRequests.copyId, copies.id))
    .where(and(viewCondition(view), searchCondition(query)));
  return row?.count ?? 0;
}

/** The size of each view, in one statement. Each count is answered by a partial index. */
export function loanCountsStatement(now: Date) {
  const count = (where: SQL) => sql`(SELECT count(*) FROM ${borrowRequests} WHERE ${where})`;
  return sql`SELECT ${count(isPending)} AS "pending", ${count(isApproved)} AS "active",
    ${count(sql`${isApproved} AND ${borrowRequests.dueDate} < ${now.getTime()}`)} AS "overdue"`;
}

export async function getLoanCounts(now: Date): Promise<LoanCounts> {
  const db = await getDb();
  return db.get<LoanCounts>(loanCountsStatement(now));
}

export async function getBorrowRequestStatus(requestId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ status: borrowRequests.status })
    .from(borrowRequests)
    .where(eq(borrowRequests.id, requestId))
    .limit(1);
  return row?.status;
}

/**
 * Approves a pending request by giving it a copy of the same title, in one statement that only
 * matches while the copy is lendable. `OR IGNORE` turns a lost race for the same copy, which the
 * unique index on active loans rejects, into "no row changed". Returns false when nothing
 * changed: the request is not pending, the copy belongs to another title, or it is not lendable.
 */
export async function approvePendingRequest(
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

/** Rejects the request only while it is pending. Returns false when it is not. */
export async function rejectPendingRequest(
  requestId: string,
  decision: { librarianId: string; reason: string; decidedAt: Date },
) {
  const db = await getDb();
  const rows = await db
    .update(borrowRequests)
    .set({
      status: "rejected",
      librarianId: decision.librarianId,
      rejectionReason: decision.reason,
      updatedAt: decision.decidedAt,
    })
    .where(and(eq(borrowRequests.id, requestId), isPending))
    .returning({ id: borrowRequests.id });
  return rows.length > 0;
}

/**
 * Reopens a returned loan only while its copy remains free. The unique active-loan index makes a
 * concurrent loan a no-op, so the caller can report that the undo was refused.
 */
export async function reopenReturnedLoan(requestId: string) {
  const db = await getDb();
  const rows = await db.all(sql`
    UPDATE OR IGNORE ${borrowRequests}
    SET "status" = 'approved', "return_date" = NULL, "updated_at" = ${Date.now()}
    WHERE "id" = ${requestId} AND "status" = 'returned'
    RETURNING "id"`);
  return rows.length > 0;
}

/** Marks an approved loan returned, which frees its copy. Returns false when it was not approved. */
export async function returnApprovedLoan(requestId: string) {
  const db = await getDb();
  const now = new Date();
  const rows = await db
    .update(borrowRequests)
    .set({ status: "returned", returnDate: now, updatedAt: now })
    .where(and(eq(borrowRequests.id, requestId), isApproved))
    .returning({ id: borrowRequests.id });
  return rows.length > 0;
}
