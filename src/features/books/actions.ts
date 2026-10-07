"use server";

import { z } from "zod";
import {
  authenticatedAction,
  staffAction,
  getVerifiedUserId,
} from "@/features/auth/protected-action";
import {
  AddBookImageSchema,
  BookFieldsSchema,
  BookIdSchema,
  BorrowRequestSchema,
  ImageRefSchema,
  ImageUploadSchema,
  SearchSchema,
  SetHeartSchema,
  UpdateBookSchema,
} from "./schemas";
import { listCategories, setHeartRecord } from "./repository";
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
  createBorrowRequestService,
} from "./service";
import { Err, Ok } from "@/lib/result";
import type { ActionResult } from "@/lib/action";
import type { BookDetailed } from "./types";

export async function getBooks(
  filters?: z.input<typeof SearchSchema>,
): Promise<ActionResult<BookDetailed[]>> {
  const parsed = SearchSchema.safeParse(filters ?? {});
  if (!parsed.success) {
    return Err({ code: "invalid", message: "Los filtros de búsqueda no son válidos." });
  }
  return Ok(await getBooksService(parsed.data, await getVerifiedUserId()));
}

export const getFavoriteBooks = authenticatedAction(z.object({}), async (_input, { user }) =>
  getFavoriteBooksService(user.id),
);

export async function getBookById(id: string) {
  const parsed = BookIdSchema.safeParse({ bookId: id });
  if (!parsed.success) return Err("not_found");
  return getBookByIdService(parsed.data.bookId, await getVerifiedUserId());
}

export const setHeart = authenticatedAction(
  SetHeartSchema,
  async ({ bookId, hearted }, session) => {
    await setHeartRecord(bookId, session.user.id, hearted);
    return { hearted };
  },
);

export const createBorrowRequest = authenticatedAction(
  BorrowRequestSchema,
  async ({ bookId, note }, session) => createBorrowRequestService(bookId, session.user.id, note),
);

export async function getCategories() {
  return listCategories();
}

export const uploadBookImage = staffAction(ImageUploadSchema, async (file) =>
  uploadBookImageService(file),
);

export const deleteBookImage = staffAction(ImageRefSchema, async ({ imageId, bookId }) =>
  deleteBookImageService(imageId, bookId),
);

export const setCoverImage = staffAction(ImageRefSchema, async ({ imageId, bookId }) =>
  setCoverImageService(imageId, bookId),
);

export const addBookImage = staffAction(AddBookImageSchema, async (input) =>
  addBookImageService(input),
);

export const deleteBook = staffAction(BookIdSchema, async ({ bookId }) => {
  return deleteBookService(bookId);
});

export const updateBook = staffAction(UpdateBookSchema, async ({ id, ...data }) => {
  return updateBookService(id, data);
});

export const createBook = staffAction(BookFieldsSchema, async (data) => {
  return createBookService(data);
});
