import { getDb } from "@/lib/db";
import { books, borrowRequests, copies, user, userBookHearts } from "@/lib/db/schema";
import { count, eq, sql, gte, desc, isNotNull } from "drizzle-orm";
import { outer } from "@/lib/db/qualified";

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
