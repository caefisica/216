"use server";

import { z } from "zod";
import {
  authenticatedAction,
  staffAction,
  getSession,
  getVerifiedUserId,
  isVerifiedStaff,
} from "@/features/auth/protected-action";
import {
  AddBookImageSchema,
  AddCopySchema,
  BookIdSchema,
  BorrowRequestSchema,
  CopyIdSchema,
  CreateBookSchema,
  CreateDonorSchema,
  ImageRefSchema,
  ImageUploadSchema,
  SearchSchema,
  SetHeartSchema,
  UpdateBookSchema,
  UpdateCopySchema,
} from "./schemas";
import { setHeartRecord } from "./repository";
import {
  getBooksService,
  getFacetsService,
  getFavoriteBooksService,
  getBookByIdService,
  uploadBookImageService,
  deleteBookImageService,
  setCoverImageService,
  addBookImageService,
  deleteBookService,
  updateBookService,
  createBookService,
  addCopyService,
  updateCopyService,
  deleteCopyService,
  createDonorService,
  createBorrowRequestService,
} from "./service";
import { Err, Ok } from "@/lib/result";
import type { ActionResult } from "@/lib/action";
import type { BookPage } from "./types";

export async function getBooks(
  filters?: z.input<typeof SearchSchema>,
): Promise<ActionResult<BookPage>> {
  const parsed = SearchSchema.safeParse(filters ?? {});
  if (!parsed.success) {
    return Err({ code: "invalid", message: "Los filtros de búsqueda no son válidos." });
  }
  const { user } = await getSession();
  const staff = isVerifiedStaff(user);
  return Ok(await getBooksService(parsed.data, user?.emailVerified ? user.id : null, staff));
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

export async function getFacets() {
  return getFacetsService();
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

export const deleteBook = staffAction(BookIdSchema, async ({ bookId }) =>
  deleteBookService(bookId),
);

export const updateBook = staffAction(UpdateBookSchema, async ({ id, ...data }) =>
  updateBookService(id, data),
);

export const createBook = staffAction(CreateBookSchema, async ({ copy, ...data }) =>
  createBookService(data, copy),
);

export const addCopy = staffAction(AddCopySchema, async ({ bookId, ...data }) =>
  addCopyService(bookId, data),
);

export const updateCopy = staffAction(UpdateCopySchema, async ({ copyId, ...data }) =>
  updateCopyService(copyId, data),
);

export const deleteCopy = staffAction(CopyIdSchema, async ({ copyId }) =>
  deleteCopyService(copyId),
);

export const createDonor = staffAction(CreateDonorSchema, async ({ name }) =>
  createDonorService(name),
);
