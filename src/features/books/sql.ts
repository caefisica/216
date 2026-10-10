import { sql, type SQL } from "drizzle-orm";

/**
 * A copy is lendable when it is present and no approved loan holds it. Availability is derived
 * from these two facts and never stored, so a loan and its copy cannot disagree.
 */
const LENDABLE = sql.raw(`"copies"."status" = 'present' AND NOT EXISTS (
  SELECT 1 FROM "borrow_requests"
  WHERE "borrow_requests"."copy_id" = "copies"."id" AND "borrow_requests"."status" = 'approved')`);

export const copyIsLendable = LENDABLE;

/** The number of lendable copies of the book whose id `bookId` evaluates to. */
export const lendableCopyCount = (bookId: SQL) =>
  sql<number>`(SELECT count(*) FROM "copies" WHERE "copies"."book_id" = ${bookId} AND ${LENDABLE})`.mapWith(
    Number,
  );

/** True when the book whose id `bookId` evaluates to has a lendable copy; it stops at the first. */
export const hasLendableCopy = (bookId: SQL) =>
  sql`EXISTS (SELECT 1 FROM "copies" WHERE "copies"."book_id" = ${bookId} AND ${LENDABLE})`;

export const copyCount = (bookId: SQL) =>
  sql<number>`(SELECT count(*) FROM "copies" WHERE "copies"."book_id" = ${bookId})`.mapWith(Number);

/** Returns the due date of the approved loan for `copyId`, or null when the copy is not on loan. */
export const activeLoanDue = (copyId: SQL) =>
  sql`(SELECT "borrow_requests"."due_date" FROM "borrow_requests" WHERE "borrow_requests"."copy_id" = ${copyId} AND "borrow_requests"."status" = 'approved')`.mapWith(
    (value: number | null) => (value === null ? null : new Date(Number(value))),
  );

/** The id of the approved loan that holds the copy whose id `copyId` evaluates to, or null. */
export const activeLoanId = (copyId: SQL) =>
  sql<
    string | null
  >`(SELECT "borrow_requests"."id" FROM "borrow_requests" WHERE "borrow_requests"."copy_id" = ${copyId} AND "borrow_requests"."status" = 'approved')`;
