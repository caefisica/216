import { z } from "zod";

export const BookIdSchema = z.object({ bookId: z.uuid() });

export const SearchSchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.string().optional(),
});

export const AddBookImageSchema = z.object({
  bookId: z.uuid(),
  imageUrl: z.string().startsWith("/media/"),
  isCover: z.boolean(),
  displayOrder: z.number(),
});

export const UpdateBookSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  author: z.string(),
  isbn: z.string().optional().nullable(),
  publisher: z.string().optional().nullable(),
  publicationYear: z.coerce.number().optional().nullable(),
  pages: z.coerce.number().optional().nullable(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.string(),
  categoryId: z.string().optional().nullable(),
});

export const CreateBookSchema = z.object({
  title: z.string(),
  author: z.string(),
  isbn: z.string().optional().nullable(),
  publisher: z.string().optional().nullable(),
  publicationYear: z.coerce.number().optional().nullable(),
  pages: z.coerce.number().optional().nullable(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.string(),
  categoryId: z.string().optional().nullable(),
});
