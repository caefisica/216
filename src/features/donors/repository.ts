import { getDb } from "@/lib/db";
import { books, copies, donors } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export async function listDonorGifts() {
  const db = await getDb();
  const donorRows = await db
    .select({
      donorId: donors.id,
      donorName: donors.name,
      motivation: donors.motivation,
      bookId: books.id,
      bookCode: books.code,
      title: books.title,
      author: books.author,
      copyCount: sql<number>`count(${copies.id})`.mapWith(Number),
    })
    .from(donors)
    .innerJoin(copies, eq(copies.donorId, donors.id))
    .innerJoin(books, eq(copies.bookId, books.id))
    .groupBy(donors.id, books.id)
    .orderBy(
      desc(sql`sum(count(${copies.id})) over (partition by ${donors.id})`),
      donors.name,
      donors.id,
      books.title,
    );

  const donorsById = new Map<
    string,
    {
      id: string;
      name: string;
      motivation: string | null;
      copyCount: number;
      books: {
        id: string;
        code: string;
        title: string;
        author: string | null;
        copyCount: number;
      }[];
    }
  >();

  for (const row of donorRows) {
    const donor = donorsById.get(row.donorId) ?? {
      id: row.donorId,
      name: row.donorName,
      motivation: row.motivation,
      copyCount: 0,
      books: [],
    };
    donor.copyCount += row.copyCount;
    donor.books.push({
      id: row.bookId,
      code: row.bookCode,
      title: row.title,
      author: row.author,
      copyCount: row.copyCount,
    });
    donorsById.set(row.donorId, donor);
  }

  const donorGroups = [...donorsById.values()];

  return {
    donors: donorGroups,
    totalCopies: donorGroups.reduce((total, donor) => total + donor.copyCount, 0),
  };
}
