import { getDb } from "@/lib/db";
import { books, copies, donors } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function listDonors() {
  const db = await getDb();
  return db
    .select({
      id: donors.id,
      name: donors.name,
      motivation: donors.motivation,
      copyCount: sql<number>`count(${copies.id})`.mapWith(Number),
    })
    .from(donors)
    .innerJoin(copies, eq(copies.donorId, donors.id))
    .groupBy(donors.id)
    .orderBy(sql`count(${copies.id}) DESC`, donors.name);
}

export async function listDonatedCopies() {
  const db = await getDb();
  return db
    .select({
      id: copies.id,
      code: copies.code,
      volume: copies.volume,
      bookId: books.id,
      title: books.title,
      author: books.author,
      donor: { id: donors.id, name: donors.name },
    })
    .from(copies)
    .innerJoin(books, eq(copies.bookId, books.id))
    .innerJoin(donors, eq(copies.donorId, donors.id))
    .orderBy(donors.name, copies.code);
}

export async function getDonationStats() {
  const db = await getDb();
  const [stats] = await db
    .select({
      totalCopies: sql<number>`count(${copies.id})`.mapWith(Number),
      totalDonors: sql<number>`count(distinct ${copies.donorId})`.mapWith(Number),
    })
    .from(copies)
    .where(sql`${copies.donorId} IS NOT NULL`);

  return stats;
}
