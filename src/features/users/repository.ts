import { getDb } from "@/lib/db";
import { user, borrowRequests, books, copies, type Role } from "@/lib/db/schema";
import { bookSummaryColumns } from "@/features/books/repository";
import { eq, desc } from "drizzle-orm";

/** Every `user` column except the password hash. Select this, never the whole table, for data that reaches the browser. */
export const publicUserColumns = {
  id: user.id,
  email: user.email,
  name: user.name,
  emailVerified: user.emailVerified,
  role: user.role,
  createdAt: user.createdAt,
};

export async function listUsers() {
  const db = await getDb();
  return db.select(publicUserColumns).from(user).orderBy(desc(user.createdAt));
}

export async function listUserActivity(userId: string) {
  const db = await getDb();
  return db
    .select({
      id: borrowRequests.id,
      userId: borrowRequests.userId,
      bookId: borrowRequests.bookId,
      copyId: borrowRequests.copyId,
      status: borrowRequests.status,
      requestDate: borrowRequests.requestDate,
      approvedDate: borrowRequests.approvedDate,
      dueDate: borrowRequests.dueDate,
      returnDate: borrowRequests.returnDate,
      notes: borrowRequests.notes,
      rejectionReason: borrowRequests.rejectionReason,
      librarianId: borrowRequests.librarianId,
      createdAt: borrowRequests.createdAt,
      updatedAt: borrowRequests.updatedAt,
      book: bookSummaryColumns,
      copy: { id: copies.id, code: copies.code, volume: copies.volume },
    })
    .from(borrowRequests)
    .leftJoin(books, eq(borrowRequests.bookId, books.id))
    .leftJoin(copies, eq(borrowRequests.copyId, copies.id))
    .where(eq(borrowRequests.userId, userId))
    .orderBy(desc(borrowRequests.requestDate));
}

export async function updateUserName(userId: string, name?: string) {
  const db = await getDb();
  if (!name) {
    const [currentUser] = await db
      .select(publicUserColumns)
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    return currentUser;
  }
  const [updatedUser] = await db
    .update(user)
    .set({ name })
    .where(eq(user.id, userId))
    .returning(publicUserColumns);
  return updatedUser;
}

export async function setUserRole(userId: string, newRole: Role) {
  const db = await getDb();
  const rows = await db
    .update(user)
    .set({ role: newRole })
    .where(eq(user.id, userId))
    .returning({ id: user.id });
  return rows.length > 0;
}
