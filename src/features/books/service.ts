import { revalidatePath } from "next/cache";
import { deleteFile, getFileKey, getFileUrl, uploadFile } from "@/lib/storage";
import { Ok, Err } from "@/lib/result";
import {
  listBooks,
  listBooksByIds,
  listBookImages,
  listBookCategories,
  listHeartedBookIds,
  getBookById,
  listBookImagesByBookId,
  listBookCategoriesByBookId,
  hasHeart,
  getBookImageById,
  deleteBookImageRecord,
  setCoverImageRecord,
  clearCoverFlags,
  setBookImageUrl,
  addBookImageRecord,
  listBookImagesForDelete,
  deleteBookRecord,
  updateBookRecord,
  createBookRecord,
} from "./repository";

export async function getBooksService(
  filters: { search?: string; status?: string; categoryId?: string },
  userId?: string | null,
) {
  const booksData = await listBooks(filters);
  const bookIds = booksData.map((b) => b.id);
  if (bookIds.length === 0) return [];

  const [imagesData, categoriesData, heartedBookIds] = await Promise.all([
    listBookImages(bookIds),
    listBookCategories(bookIds),
    userId ? listHeartedBookIds(userId) : Promise.resolve<string[]>([]),
  ]);

  return booksData.map((book) => {
    const bookImgs = imagesData.filter((img) => img.bookId === book.id);
    const bookCats = categoriesData.filter((bc) => bc.bookId === book.id).map((bc) => bc.category);
    return {
      ...book,
      images: bookImgs,
      coverImage: bookImgs.find((img) => img.isCover) || bookImgs[0],
      categories: bookCats,
      isHearted: heartedBookIds.includes(book.id),
    };
  });
}

export async function getFavoriteBooksService(userId?: string | null) {
  if (!userId) return [];
  const bookIds = await listHeartedBookIds(userId);
  if (bookIds.length === 0) return [];

  const [booksData, imagesData, categoriesData] = await Promise.all([
    listBooksByIds(bookIds),
    listBookImages(bookIds),
    listBookCategories(bookIds),
  ]);

  return booksData.map((book) => {
    const bookImgs = imagesData.filter((img) => img.bookId === book.id);
    const bookCats = categoriesData.filter((bc) => bc.bookId === book.id).map((bc) => bc.category);
    return {
      ...book,
      images: bookImgs,
      coverImage: bookImgs.find((img) => img.isCover) || bookImgs[0],
      categories: bookCats,
      isHearted: true,
    };
  });
}

export async function getBookByIdService(id: string, userId?: string | null) {
  const book = await getBookById(id);
  if (!book) return Err("not_found");

  const [imagesData, categoriesData, isHearted] = await Promise.all([
    listBookImagesByBookId(id),
    listBookCategoriesByBookId(id),
    userId ? hasHeart(id, userId) : Promise.resolve(false),
  ]);

  return Ok({
    ...book,
    images: imagesData,
    coverImage: imagesData.find((img) => img.isCover) || imagesData[0],
    categories: categoriesData.map((c) => c.category),
    isHearted,
  });
}

export async function uploadBookImageService(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `book-images/${crypto.randomUUID()}-${file.name}`;
  await uploadFile(fileName, buffer, file.type);
  return { url: getFileUrl(fileName) };
}

export async function deleteBookImageService(imageId: string) {
  const img = await getBookImageById(imageId);
  const key = img && getFileKey(img.imageUrl);
  if (key) {
    try {
      await deleteFile(key);
    } catch (error) {
      console.error("Error deleting file from R2:", error);
    }
  }

  await deleteBookImageRecord(imageId);
  return { success: true };
}

export async function setCoverImageService(imageId: string, bookId: string) {
  await setCoverImageRecord(imageId, bookId);
  const img = await getBookImageById(imageId);
  if (img) {
    await setBookImageUrl(bookId, img.imageUrl);
  }

  revalidatePath(`/books/${bookId}`);
  return { success: true };
}

export async function addBookImageService(input: {
  bookId: string;
  imageUrl: string;
  isCover: boolean;
  displayOrder: number;
}) {
  if (input.isCover) {
    await clearCoverFlags(input.bookId);
    await setBookImageUrl(input.bookId, input.imageUrl);
  }

  await addBookImageRecord(input);
  revalidatePath(`/books/${input.bookId}`);
  return { success: true };
}

export async function deleteBookService(bookId: string) {
  const images = await listBookImagesForDelete(bookId);
  for (const img of images) {
    const key = getFileKey(img.imageUrl);
    if (key) await deleteFile(key);
  }

  await deleteBookRecord(bookId);
  revalidatePath("/");
  return { success: true };
}

export async function updateBookService(data: {
  id: string;
  title: string;
  author: string;
  isbn?: string | null;
  publisher?: string | null;
  publicationYear?: number | null;
  pages?: number | null;
  location?: string | null;
  description?: string | null;
  status: string;
  categoryId?: string | null;
}) {
  await updateBookRecord({
    id: data.id,
    title: data.title,
    author: data.author,
    isbn: data.isbn ?? null,
    publisher: data.publisher ?? null,
    publicationYear: data.publicationYear ?? 0,
    pages: data.pages ?? 0,
    location: data.location ?? null,
    description: data.description ?? null,
    status: data.status as "available" | "borrowed" | "reserved",
    categoryId: data.categoryId ?? null,
  });
  revalidatePath(`/books/${data.id}`);
  revalidatePath("/");
  return { success: true };
}

export async function createBookService(data: {
  title: string;
  author: string;
  isbn?: string | null;
  publisher?: string | null;
  publicationYear?: number | null;
  pages?: number | null;
  location?: string | null;
  description?: string | null;
  status: string;
  categoryId?: string | null;
}) {
  const bookId = crypto.randomUUID();
  await createBookRecord({
    id: bookId,
    title: data.title,
    author: data.author,
    isbn: data.isbn ?? null,
    publisher: data.publisher ?? null,
    publicationYear: data.publicationYear ?? 0,
    pages: data.pages ?? 0,
    location: data.location ?? null,
    description: data.description ?? null,
    status: data.status as "available" | "borrowed" | "reserved",
    categoryId: data.categoryId ?? null,
  });
  revalidatePath("/");
  return { success: true, id: bookId };
}
