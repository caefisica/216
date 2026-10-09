import { z } from "zod";
import { CopyCondition, CopyOrigin, CopyStatus, LocationHolds } from "@/lib/db/schema";

export const BookIdSchema = z.object({ bookId: z.uuid() });

export const SetHeartSchema = z.object({ bookId: z.uuid(), hearted: z.boolean() });

/** The catalogue filters. They are also the URL search parameters of the list, so all are text. */
export const SearchSchema = z.object({
  search: z.string().trim().max(100).optional(),
  /** A category code. A top-level code includes its subcategories. */
  category: z.string().max(20).optional(),
  cabinet: z.string().max(60).optional(),
  shelf: z.coerce.number().int().min(0).max(99).optional(),
  donor: z.uuid().optional(),
  availability: z.enum(["available", "unavailable"]).optional(),
  /** Staff filters: a copy whose code is not on the spine yet, a copy with no place. */
  unlabelled: z.literal("1").optional(),
  unplaced: z.literal("1").optional(),
  sort: z.enum(["title", "code"]).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
});

export const PAGE_SIZE = 50;

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

const optionalId = z
  .uuid()
  .nullish()
  .transform((value) => value ?? null);

/** The title. Its code and counters are never typed in; the app issues them. */
export const BookFieldsSchema = z.object({
  title: z.string().trim().min(1).max(300),
  author: optionalText(300),
  isbn: optionalText(20),
  description: optionalText(5000),
  categoryId: z.uuid(),
});

export const CopyFieldsSchema = z.object({
  origin: z.enum(CopyOrigin),
  volume: optionalText(40),
  pieces: z.number().int().min(1).max(1000),
  edition: optionalText(40),
  year: z
    .number()
    .int()
    .min(1400)
    .max(2100)
    .nullish()
    .transform((value) => value ?? null),
  country: optionalText(60),
  publisher: optionalText(120),
  locationId: optionalId,
  donorId: optionalId,
  status: z.enum(CopyStatus),
  condition: z
    .enum(CopyCondition)
    .nullish()
    .transform((value) => value ?? null),
  labelled: z.boolean(),
  notes: optionalText(1000),
});

export const CreateBookSchema = BookFieldsSchema.extend({ copy: CopyFieldsSchema });

export const UpdateBookSchema = BookFieldsSchema.extend({ id: z.uuid() });

export const AddCopySchema = CopyFieldsSchema.extend({ bookId: z.uuid() });

export const UpdateCopySchema = CopyFieldsSchema.extend({ copyId: z.uuid() });

export const CopyIdSchema = z.object({ copyId: z.uuid() });

export const CreateDonorSchema = z.object({
  name: z.string().trim().min(1).max(120),
  motivation: optionalText(500),
});
export const UpdateDonorSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(120),
  motivation: optionalText(500),
});

const LocationFieldsSchema = z.object({
  cabinet: z.string().trim().min(1).max(60),
  shelf: z.coerce.number().int().min(0).max(99),
  bay: z.coerce.number().int().min(0).max(99),
  categoryId: optionalId,
  holds: z.enum(LocationHolds),
});

export const CreateLocationSchema = LocationFieldsSchema;
export const UpdateLocationSchema = LocationFieldsSchema.extend({ id: z.uuid() });

export const BorrowRequestSchema = z.object({
  bookId: z.uuid(),
  note: optionalText(500),
});

export type BookFields = z.output<typeof BookFieldsSchema>;
export type CopyFields = z.output<typeof CopyFieldsSchema>;
export type BookFilters = z.output<typeof SearchSchema>;
export type LocationFields = z.output<typeof LocationFieldsSchema>;
