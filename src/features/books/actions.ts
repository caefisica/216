"use server";

import { z } from "zod";
import { authenticatedAction, staffAction, getSession } from "@/features/auth/protected-action";
import {
  AddBookImageSchema,
  BookIdSchema,
  SearchSchema,
  UpdateBookSchema,
  CreateBookSchema,
} from "./schemas";
import { listCategories, toggleHeartRecord, createBorrowRequestRecord } from "./repository";
import {
  getBooksService,
  getFavoriteBooksService,
  getBookByIdService,
  uploadBookImageService,
  deleteBookImageService,
  setCoverImageService,
  addBookImageService,
  deleteBookService,
  updateBookService,
  createBookService,
} from "./service";

export async function getBooks(filters?: z.infer<typeof SearchSchema>) {
  const session = await getSession();
  const parsedFilters = SearchSchema.parse(filters || {});
  return getBooksService(parsedFilters, session.user?.id ?? null);
}

export async function getFavoriteBooks() {
  const session = await getSession();
  return getFavoriteBooksService(session.user?.id ?? null);
}

export async function getBookById(id: string) {
  const session = await getSession();
  return getBookByIdService(id, session.user?.id ?? null);
}

export const toggleHeart = authenticatedAction(BookIdSchema, async ({ bookId }, session) => {
  const hearted = await toggleHeartRecord(bookId, session.user.id);
  return { hearted };
});

export const createBorrowRequest = authenticatedAction(
  z.object({ bookId: z.uuid(), note: z.string().optional() }),
  async ({ bookId, note }, session) => {
    await createBorrowRequestRecord(bookId, session.user.id, note);
    return { success: true };
  },
);

export async function getCategories() {
  return listCategories();
}

export const uploadBookImage = staffAction(z.instanceof(FormData), async (formData) => {
  const file = formData.get("file") as File;
  if (!file) throw new Error("No file uploaded");
  return uploadBookImageService(file);
});

export const deleteBookImage = staffAction(
  z.object({ imageId: z.uuid(), bookId: z.uuid() }),
  async ({ imageId }) => deleteBookImageService(imageId),
);

export const setCoverImage = staffAction(
  z.object({ imageId: z.uuid(), bookId: z.uuid(), isExisting: z.boolean() }),
  async ({ imageId, bookId }) => setCoverImageService(imageId, bookId),
);

export const addBookImage = staffAction(AddBookImageSchema, async (input) =>
  addBookImageService(input),
);

export const deleteBook = staffAction(BookIdSchema, async ({ bookId }) => {
  return deleteBookService(bookId);
});

export const updateBook = staffAction(UpdateBookSchema, async (data) => {
  return updateBookService({
    id: data.id,
    title: data.title,
    author: data.author,
    isbn: data.isbn,
    publisher: data.publisher,
    publicationYear: data.publicationYear,
    pages: data.pages,
    location: data.location,
    description: data.description,
    status: data.status,
    categoryId: data.categoryId,
  });
});

export const createBook = staffAction(CreateBookSchema, async (data) => {
  return createBookService({
    title: data.title,
    author: data.author,
    isbn: data.isbn || null,
    publisher: data.publisher || null,
    publicationYear: data.publicationYear,
    pages: data.pages,
    location: data.location || null,
    description: data.description || null,
    status: data.status || "available",
    categoryId: data.categoryId || null,
  });
});
