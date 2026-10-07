import { revalidatePath } from "next/cache";
import { deleteFile, fileExists, getFileKey, getFileUrl, uploadFile } from "@/lib/storage";
import { IMAGE_EXTENSIONS, type BookFields, type BookFilters } from "./schemas";
import { Ok, Err } from "@/lib/result";
import { UserError } from "@/lib/action";
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
  createBorrowRequestRecord,
  addBookImageRecord,
  deleteBookRecord,
  updateBookRecord,
  createBookRecord,
} from "./repository";

export async function getBooksService(filters: BookFilters, userId?: string | null) {
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

export async function getFavoriteBooksService(userId: string) {
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

/** `prefix` ends in a slash. The name comes from the file type, never from the client's file name. */
export function newImageKey(prefix: string, file: File) {
  return `${prefix}${crypto.randomUUID()}.${IMAGE_EXTENSIONS[file.type]}`;
}

export async function uploadBookImageService(file: File) {
  const fileName = newImageKey("book-images/", file);
  await uploadFile(fileName, file, file.type);
  return { url: getFileUrl(fileName) };
}

export async function deleteBookImageService(imageId: string, bookId: string) {
  const img = await getBookImageById(imageId, bookId);
  if (!img) throw new UserError("Imagen no encontrada.");

  await deleteBookImageRecord(imageId, bookId);

  const key = getFileKey(img.imageUrl);
  if (key) {
    try {
      await deleteFile(key);
    } catch (error) {
      console.error("Error deleting file from R2:", error);
    }
  }

  revalidatePath(`/books/${bookId}`);
}

export async function setCoverImageService(imageId: string, bookId: string) {
  if (!(await getBookImageById(imageId, bookId))) throw new UserError("Imagen no encontrada.");

  await setCoverImageRecord(imageId, bookId);
  revalidatePath(`/books/${bookId}`);
}

export async function addBookImageService(input: {
  bookId: string;
  imageUrl: string;
  isCover: boolean;
  displayOrder: number;
}) {
  const key = getFileKey(input.imageUrl);
  if (!key || !(await fileExists(key))) throw new UserError("La imagen no se ha subido.");
  if (!(await getBookById(input.bookId))) throw new UserError("Libro no encontrado.");

  if (!(await addBookImageRecord(input))) throw new UserError("Esa imagen ya está en uso.");
  revalidatePath(`/books/${input.bookId}`);
}

export async function deleteBookService(bookId: string) {
  const images = await listBookImagesByBookId(bookId);
  for (const img of images) {
    const key = getFileKey(img.imageUrl);
    if (key) await deleteFile(key);
  }

  await deleteBookRecord(bookId);
  revalidatePath("/");
}

export async function updateBookService(id: string, data: BookFields) {
  if (!(await updateBookRecord(id, data))) throw new UserError("Libro no encontrado.");
  revalidatePath(`/books/${id}`);
  revalidatePath("/");
}

export async function createBookService(data: BookFields) {
  const bookId = crypto.randomUUID();
  await createBookRecord(bookId, data);
  revalidatePath("/");
  return { id: bookId };
}

export async function createBorrowRequestService(
  bookId: string,
  userId: string,
  note: string | null,
) {
  if (!(await createBorrowRequestRecord(bookId, userId, note))) {
    // The insert refused; the book is read only to say why.
    const book = await getBookById(bookId);
    if (!book) throw new UserError("Libro no encontrado.");
    if (book.status !== "available") throw new UserError("El libro no está disponible.");
    throw new UserError("Ya tienes una solicitud pendiente para este libro.");
  }

  revalidatePath("/");
}
