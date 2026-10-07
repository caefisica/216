import { getDb } from "@/lib/db";
import { books, borrowRequests, user, userBookHearts } from "@/lib/db/schema";
import { eq, sql, gte, desc } from "drizzle-orm";
import { outer } from "@/lib/db/qualified";

export async function getAdminCounts() {
  const db = await getDb();
  const [
    totalBooks,
    availableBooks,
    borrowedBooks,
    totalUsers,
    pendingRequests,
    totalBorrows,
    activeUsers,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(books),
    db
      .select({ count: sql<number>`count(*)` })
      .from(books)
      .where(eq(books.status, "available")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(books)
      .where(eq(books.status, "borrowed")),
    db.select({ count: sql<number>`count(*)` }).from(user),
    db
      .select({ count: sql<number>`count(*)` })
      .from(borrowRequests)
      .where(eq(borrowRequests.status, "pending")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(borrowRequests)
      .where(eq(borrowRequests.status, "approved")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(gte(user.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))),
  ]);

  return {
    totalBooks: Number(totalBooks[0].count),
    availableBooks: Number(availableBooks[0].count),
    borrowedBooks: Number(borrowedBooks[0].count),
    totalUsers: Number(totalUsers[0].count),
    pendingRequests: Number(pendingRequests[0].count),
    totalBorrows: Number(totalBorrows[0].count),
    activeUsers: Number(activeUsers[0].count),
  };
}

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
      user,
    })
    .from(borrowRequests)
    .innerJoin(books, eq(borrowRequests.bookId, books.id))
    .innerJoin(user, eq(borrowRequests.userId, user.id))
    .where(eq(borrowRequests.status, "pending"))
    .orderBy(desc(borrowRequests.requestDate));
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
        sql<number>`(SELECT count(*) FROM ${borrowRequests} WHERE ${borrowRequests.bookId} = ${outer("books", "id")} AND ${borrowRequests.status} = 'approved')`.mapWith(
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
  const borrowCount = sql<number>`(SELECT count(*) FROM ${borrowRequests} WHERE ${borrowRequests.userId} = ${outer("user", "id")} AND ${borrowRequests.status} = 'approved')`;
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
      borrows: sql<number>`COUNT(*) FILTER (WHERE ${borrowRequests.status} = 'approved')`,
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

export async function updateBorrowRequestStatus(
  requestId: string,
  updateData: Partial<typeof borrowRequests.$inferInsert>,
) {
  const db = await getDb();
  const [request] = await db
    .update(borrowRequests)
    .set(updateData)
    .where(eq(borrowRequests.id, requestId))
    .returning();
  return request;
}

export async function setBookStatus(bookId: string, status: "available" | "borrowed") {
  const db = await getDb();
  await db.update(books).set({ status }).where(eq(books.id, bookId));
}
