import { z } from "zod";
import { BookStatus } from "@/lib/db/schema";

export const BookIdSchema = z.object({ bookId: z.uuid() });

export const SetHeartSchema = z.object({ bookId: z.uuid(), hearted: z.boolean() });

export const SearchSchema = z.object({
  search: z.string().max(100).optional(),
  categoryId: z.string().optional(),
  status: z.enum([...BookStatus, "all"]).optional(),
});

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** The file types a book image may have, with the extension each is stored under. */
export const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const IMAGE_FILE_EXTENSIONS = Object.values(IMAGE_EXTENSIONS).join("|");

/** The `file` entry of a form: an image of an allowed type, at most `MAX_IMAGE_BYTES`. */
export const ImageUploadSchema = z
  .instanceof(FormData)
  .transform((form) => form.get("file"))
  .pipe(
    z
      .instanceof(File, { error: "No file uploaded" })
      .refine((file) => file.type in IMAGE_EXTENSIONS, { error: "Unsupported image type" })
      .refine((file) => file.size <= MAX_IMAGE_BYTES, { error: "Image is too large" }),
  );

export const AddBookImageSchema = z.object({
  bookId: z.uuid(),
  imageUrl: z
    .string()
    .regex(new RegExp(`^/media/book-images/[0-9a-f-]{36}\\.(${IMAGE_FILE_EXTENSIONS})$`)),
  isCover: z.boolean(),
  displayOrder: z.number().int().min(0),
});

export const ImageRefSchema = z.object({ imageId: z.uuid(), bookId: z.uuid() });

/** Empty text means "not set" and is stored as null, so an emptied field clears the column. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

const optionalCount = (max: number) =>
  z
    .number()
    .int()
    .min(1)
    .max(max)
    .nullish()
    .transform((value) => value ?? null);

export const BookFieldsSchema = z.object({
  title: z.string().trim().min(1).max(300),
  author: z.string().trim().min(1).max(300),
  isbn: optionalText(20),
  publisher: optionalText(200),
  publicationYear: optionalCount(9999),
  pages: optionalCount(100_000),
  location: optionalText(100),
  description: optionalText(5000),
  status: z.enum(BookStatus),
  categoryId: optionalText(100),
});

export const UpdateBookSchema = BookFieldsSchema.extend({ id: z.uuid() });

export const BorrowRequestSchema = z.object({
  bookId: z.uuid(),
  note: optionalText(500),
});

export type BookFields = z.output<typeof BookFieldsSchema>;
export type BookFilters = z.output<typeof SearchSchema>;
