import { revalidatePath } from "next/cache";
import { deleteFile, fileExists, getFileKey, getFileUrl, uploadFile } from "@/lib/storage";
import {
  IMAGE_EXTENSIONS,
  type BookFields,
  type BookFilters,
  type CopyFields,
  type LocationFields,
} from "./schemas";
import { Ok, Err } from "@/lib/result";
import { UserError } from "@/lib/action";
import {
  listBooks,
  listFavoriteBooks,
  getBookById,
  listBookImagesByBookId,
  listCopies,
  getBookImageById,
  deleteBookImageRecord,
  setCoverImageRecord,
  createBorrowRequestRecord,
  addBookImageRecord,
  deleteBookRecord,
  updateBookRecord,
  createBookRecord,
  createCopyRecord,
  updateCopyRecord,
  deleteCopyRecord,
  allocateBookCode,
  allocateCopy,
  isLeafCategory,
  ensureDonor,
  listFacets,
  getCategoryRef,
  listLocations,
  createLocationRecord,
  updateLocationRecord,
  updateDonorRecord,
} from "./repository";
import type { BookDetailed, BookPage } from "./types";
import { defaultLocation } from "./location";

/** The unlabelled and unplaced filters are for staff; anyone else's are ignored. */
export function getBooksService(
  filters: BookFilters,
  userId?: string | null,
  staff = false,
): Promise<BookPage> {
  const allowed = staff ? filters : { ...filters, unlabelled: undefined, unplaced: undefined };
  return listBooks(allowed, userId);
}

export function getFavoriteBooksService(userId: string) {
  return listFavoriteBooks(userId);
}

export async function getBookByIdService(id: string, userId?: string | null) {
  const book = await getBookById(id, userId);
  if (!book) return Err("not_found");

  const [images, copies] = await Promise.all([listBookImagesByBookId(id), listCopies(id)]);

  const detailed: BookDetailed = {
    ...book,
    images,
    coverImage: images.find((img) => img.isCover) || images[0],
    copies,
  };
  return Ok(detailed);
}

export async function getFacetsService() {
  const [facets, locations] = await Promise.all([listFacets(), listLocations()]);
  return { ...facets, locations };
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

/** Deletes the title with its copies, images and loan history. */
export async function deleteBookService(bookId: string) {
  const images = await listBookImagesByBookId(bookId);
  for (const img of images) {
    const key = getFileKey(img.imageUrl);
    if (key) await deleteFile(key);
  }

  await deleteBookRecord(bookId);
  revalidatePath("/");
}

async function requireLeafCategory(categoryId: string) {
  if (!(await isLeafCategory(categoryId))) {
    throw new UserError(
      "Elige una subcategoría: las categorías con subcategorías no tienen libros.",
    );
  }
}

export async function updateBookService(id: string, data: BookFields) {
  await requireLeafCategory(data.categoryId);
  if (!(await updateBookRecord(id, data))) throw new UserError("Libro no encontrado.");
  revalidatePath(`/books/${id}`);
  revalidatePath("/");
}

export async function createIntakeBookService(data: BookFields, copyCount: number) {
  await requireLeafCategory(data.categoryId);
  const code = await allocateBookCode(data.categoryId);
  if (!code) throw new UserError("Categoría no encontrada.");

  const [categoryRef, locations] = await Promise.all([
    getCategoryRef(data.categoryId),
    listLocations(),
  ]);
  if (!categoryRef) throw new UserError("Categoría no encontrada.");

  const copy: CopyFields = {
    origin: "original",
    volume: null,
    pieces: 1,
    edition: null,
    year: null,
    country: null,
    publisher: null,
    locationId: defaultLocation(locations, categoryRef, 1),
    donorId: null,
    status: "present",
    condition: null,
    labelled: false,
    notes: null,
  };
  const created = await createBookRecord({ ...data, code }, copy, copyCount, (number) => ({
    locationId: defaultLocation(locations, categoryRef, number),
  }));
  revalidatePath("/");
  return { id: created.id, code, copyCode: created.copyCode, copies: copyCount };
}

export async function addCopyService(bookId: string, data: CopyFields) {
  const next = await allocateCopy(bookId);
  if (!next) throw new UserError("Libro no encontrado.");

  await createCopyRecord(bookId, next.number, next.code, data);
  revalidatePath(`/books/${bookId}`);
  revalidatePath("/");
  return { code: next.code };
}

export async function updateCopyService(copyId: string, data: CopyFields) {
  const bookId = await updateCopyRecord(copyId, data);
  if (!bookId) throw new UserError("Ejemplar no encontrado.");
  revalidatePath(`/books/${bookId}`);
  revalidatePath("/");
}

export async function deleteCopyService(copyId: string) {
  const bookId = await deleteCopyRecord(copyId);
  if (!bookId) {
    throw new UserError(
      "Este ejemplar tiene préstamos en su historial. Márcalo como extraviado en vez de borrarlo.",
    );
  }
  revalidatePath(`/books/${bookId}`);
  revalidatePath("/");
}

export async function createDonorService(name: string, motivation: string | null = null) {
  const donor = await ensureDonor(name, motivation);
  revalidatePath("/donors");
  return { id: donor.id, name: donor.name, motivation: donor.motivation };
}

export async function updateDonorService(
  id: string,
  data: { name: string; motivation: string | null },
) {
  try {
    const donor = await updateDonorRecord(id, data);
    if (!donor) throw new UserError("Donante no encontrado.");
    revalidatePath("/");
    revalidatePath("/donors");
    return donor;
  } catch (error) {
    if (String(error).includes("donors_name_unique")) {
      throw new UserError("Ya existe un donante con ese nombre.");
    }
    throw error;
  }
}

export async function createLocationService(data: LocationFields) {
  try {
    const location = await createLocationRecord(data);
    revalidatePath("/");
    return location;
  } catch (error) {
    if (String(error).includes("locations_place_unique")) {
      throw new UserError("Ese mueble, estante y tramo ya existen.");
    }
    throw error;
  }
}

export async function updateLocationService(id: string, data: LocationFields) {
  try {
    const location = await updateLocationRecord(id, data);
    if (!location) throw new UserError("Ubicación no encontrada.");
    revalidatePath("/");
    return location;
  } catch (error) {
    if (String(error).includes("locations_place_unique")) {
      throw new UserError("Ese mueble, estante y tramo ya existen.");
    }
    throw error;
  }
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
    if (book.lendableCount === 0) throw new UserError("El libro no está disponible.");
    throw new UserError("Ya tienes una solicitud pendiente para este libro.");
  }

  revalidatePath("/");
}
