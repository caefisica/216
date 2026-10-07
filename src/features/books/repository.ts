import { getDb } from "@/lib/db";
import {
  books,
  categories,
  bookImages,
  bookCategories,
  userBookHearts,
  borrowRequests,
} from "@/lib/db/schema";
import { outer } from "@/lib/db/qualified";
import { eq, like, or, and, sql, desc, inArray } from "drizzle-orm";

export async function listBooks(filters: {
  search?: string;
  status?: string;
  categoryId?: string;
}) {
  const db = await getDb();
  const query = db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      isbn: books.isbn,
      description: books.description,
      imageUrl: books.imageUrl,
      categoryId: books.categoryId,
      status: books.status,
      publicationYear: books.publicationYear,
      publisher: books.publisher,
      pages: books.pages,
      location: books.location,
      createdAt: books.createdAt,
      updatedAt: books.updatedAt,
      heartsCount:
        sql<number>`(SELECT count(*) FROM ${userBookHearts} WHERE ${userBookHearts.bookId} = ${outer("books", "id")})`.mapWith(
          Number,
        ),
    })
    .from(books);

  const conditions = [];
  if (filters.search) {
    conditions.push(
      or(
        like(books.title, `%${filters.search}%`),
        like(books.author, `%${filters.search}%`),
        like(books.description, `%${filters.search}%`),
      ),
    );
  }
  if (filters.status && filters.status !== "all") conditions.push(eq(books.status, filters.status));
  if (filters.categoryId && filters.categoryId !== "all")
    conditions.push(eq(books.categoryId, filters.categoryId));
  if (conditions.length > 0) query.where(and(...conditions));

  return query.orderBy(desc(books.createdAt));
}

export async function listBooksByIds(bookIds: string[]) {
  const db = await getDb();
  return db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      isbn: books.isbn,
      description: books.description,
      imageUrl: books.imageUrl,
      categoryId: books.categoryId,
      status: books.status,
      publicationYear: books.publicationYear,
      publisher: books.publisher,
      pages: books.pages,
      location: books.location,
      createdAt: books.createdAt,
      updatedAt: books.updatedAt,
      heartsCount:
        sql<number>`(SELECT count(*) FROM ${userBookHearts} WHERE ${userBookHearts.bookId} = ${outer("books", "id")})`.mapWith(
          Number,
        ),
    })
    .from(books)
    .where(inArray(books.id, bookIds))
    .orderBy(desc(books.createdAt));
}

export async function listBookImages(bookIds: string[]) {
  const db = await getDb();
  return db
    .select()
    .from(bookImages)
    .where(inArray(bookImages.bookId, bookIds))
    .orderBy(bookImages.displayOrder);
}

export async function listBookImagesByBookId(bookId: string) {
  const db = await getDb();
  return db
    .select()
    .from(bookImages)
    .where(eq(bookImages.bookId, bookId))
    .orderBy(bookImages.displayOrder);
}

export async function listBookCategories(bookIds: string[]) {
  const db = await getDb();
  return db
    .select({ bookId: bookCategories.bookId, category: categories })
    .from(bookCategories)
    .innerJoin(categories, eq(bookCategories.categoryId, categories.id))
    .where(inArray(bookCategories.bookId, bookIds));
}

export async function listBookCategoriesByBookId(bookId: string) {
  const db = await getDb();
  return db
    .select({ category: categories })
    .from(bookCategories)
    .innerJoin(categories, eq(bookCategories.categoryId, categories.id))
    .where(eq(bookCategories.bookId, bookId));
}

export async function listHeartedBookIds(userId: string) {
  const db = await getDb();
  const hearts = await db
    .select({ bookId: userBookHearts.bookId })
    .from(userBookHearts)
    .where(eq(userBookHearts.userId, userId));
  return hearts.map((h) => h.bookId);
}

export async function getBookById(id: string) {
  const db = await getDb();
  const rows = await db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      isbn: books.isbn,
      description: books.description,
      imageUrl: books.imageUrl,
      categoryId: books.categoryId,
      status: books.status,
      publicationYear: books.publicationYear,
      publisher: books.publisher,
      pages: books.pages,
      location: books.location,
      createdAt: books.createdAt,
      updatedAt: books.updatedAt,
      heartsCount:
        sql<number>`(SELECT count(*) FROM ${userBookHearts} WHERE ${userBookHearts.bookId} = ${outer("books", "id")})`.mapWith(
          Number,
        ),
    })
    .from(books)
    .where(eq(books.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function hasHeart(bookId: string, userId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(userBookHearts)
    .where(and(eq(userBookHearts.bookId, bookId), eq(userBookHearts.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

export async function toggleHeartRecord(bookId: string, userId: string) {
  const db = await getDb();
  const exists = await hasHeart(bookId, userId);
  if (exists) {
    await db
      .delete(userBookHearts)
      .where(and(eq(userBookHearts.bookId, bookId), eq(userBookHearts.userId, userId)));
    return false;
  }
  await db.insert(userBookHearts).values({ bookId, userId });
  return true;
}

export async function createBorrowRequestRecord(bookId: string, userId: string, note?: string) {
  const db = await getDb();
  await db.insert(borrowRequests).values({
    id: crypto.randomUUID(),
    bookId,
    userId,
    status: "pending",
    notes: note || null,
  });
}

export async function listCategories() {
  const db = await getDb();
  return db.select().from(categories).orderBy(categories.name);
}

export async function getBookImageById(imageId: string) {
  const db = await getDb();
  const [img] = await db.select().from(bookImages).where(eq(bookImages.id, imageId)).limit(1);
  return img ?? null;
}

export async function deleteBookImageRecord(imageId: string) {
  const db = await getDb();
  await db.delete(bookImages).where(eq(bookImages.id, imageId));
}

export async function setCoverImageRecord(imageId: string, bookId: string) {
  const db = await getDb();
  await db.update(bookImages).set({ isCover: false }).where(eq(bookImages.bookId, bookId));
  await db.update(bookImages).set({ isCover: true }).where(eq(bookImages.id, imageId));
}

export async function clearCoverFlags(bookId: string) {
  const db = await getDb();
  await db.update(bookImages).set({ isCover: false }).where(eq(bookImages.bookId, bookId));
}

export async function setBookImageUrl(bookId: string, imageUrl: string) {
  const db = await getDb();
  await db.update(books).set({ imageUrl }).where(eq(books.id, bookId));
}

export async function addBookImageRecord(input: {
  bookId: string;
  imageUrl: string;
  isCover: boolean;
  displayOrder: number;
}) {
  const db = await getDb();
  await db.insert(bookImages).values({ id: crypto.randomUUID(), ...input });
}

export async function listBookImagesForDelete(bookId: string) {
  const db = await getDb();
  return db.select().from(bookImages).where(eq(bookImages.bookId, bookId));
}

export async function deleteBookRecord(bookId: string) {
  const db = await getDb();
  await db.delete(books).where(eq(books.id, bookId));
}

export async function updateBookRecord(data: {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  publisher: string | null;
  publicationYear: number;
  pages: number;
  location: string | null;
  description: string | null;
  status: "available" | "borrowed" | "reserved";
  categoryId: string | null;
}) {
  const db = await getDb();
  await db
    .update(books)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(books.id, data.id));
}

export async function createBookRecord(data: {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  publisher: string | null;
  publicationYear: number;
  pages: number;
  location: string | null;
  description: string | null;
  status: "available" | "borrowed" | "reserved";
  categoryId: string | null;
}) {
  const db = await getDb();
  await db.insert(books).values(data);
}
