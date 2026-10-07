"use server";

import { z } from "zod";
import { staffAction } from "@/features/auth/protected-action";
import { getDb } from "@/lib/db";
import { books, bookImages, bookCategories } from "@/lib/db/schema";
import { moveFile, deleteFile, getFileUrl, uploadFile } from "@/lib/storage";
import { UserError } from "@/lib/action";
import { revalidatePath } from "next/cache";
import { eq, desc } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { BookFieldsSchema, IMAGE_EXTENSIONS, ImageUploadSchema } from "../schemas";
import { newImageKey } from "../service";

const TEMP_PREFIX = "temp/";

const TempFileNameSchema = z
  .string()
  .startsWith(TEMP_PREFIX)
  .refine((name) => !name.includes(".."), { error: "Invalid file name" });

const SaveBookSchema = z.object({
  bookId: z.uuid(),
  bookData: BookFieldsSchema,
  uploadedImages: z
    .array(
      z.object({
        fileName: TempFileNameSchema,
        isCover: z.boolean(),
        altText: z.string().max(200),
      }),
    )
    .max(20),
  selectedCategories: z.array(z.uuid()).max(50),
});

export const uploadBookImage = staffAction(ImageUploadSchema, async (file) => {
  const fileName = newImageKey(TEMP_PREFIX, file);
  await uploadFile(fileName, file, file.type);
  return { url: getFileUrl(fileName), fileName };
});

async function moveImageFromTemp(tempFileName: string, bookId: string) {
  const fileExt = tempFileName.split(".").pop() ?? "";
  if (!Object.values(IMAGE_EXTENSIONS).includes(fileExt)) {
    throw new UserError("El archivo temporal no es una imagen válida.");
  }
  const newFileName = `${bookId}/${crypto.randomUUID()}.${fileExt}`;
  await moveFile(tempFileName, newFileName);
  return getFileUrl(newFileName);
}

export const saveBookWithImages = staffAction(
  SaveBookSchema,
  async ({ bookId, bookData, uploadedImages, selectedCategories }) => {
    const db = await getDb();

    const [existing] = await db
      .select({ id: books.id })
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1);
    if (!existing) throw new UserError("Libro no encontrado.");

    const finalImages: Array<{ url: string; isCover: boolean; altText: string }> = [];

    for (const image of uploadedImages) {
      try {
        finalImages.push({
          url: await moveImageFromTemp(image.fileName, bookId),
          isCover: image.isCover,
          altText: image.altText,
        });
      } catch (error) {
        console.error("Unexpected error moving file:", error);
      }
    }

    const [lastImage] = await db
      .select({ displayOrder: bookImages.displayOrder })
      .from(bookImages)
      .where(eq(bookImages.bookId, bookId))
      .orderBy(desc(bookImages.displayOrder))
      .limit(1);
    const nextDisplayOrder = lastImage ? (lastImage.displayOrder || 0) + 1 : 0;

    // One batch, so a bad category id cannot leave the book half saved.
    const statements: BatchItem<"sqlite">[] = [
      db
        .update(books)
        .set({ ...bookData, updatedAt: new Date() })
        .where(eq(books.id, bookId)),
      db.delete(bookCategories).where(eq(bookCategories.bookId, bookId)),
    ];
    if (selectedCategories.length > 0) {
      statements.push(
        db
          .insert(bookCategories)
          .values(selectedCategories.map((categoryId) => ({ bookId, categoryId }))),
      );
    }
    if (finalImages.length > 0) {
      statements.push(
        db.insert(bookImages).values(
          finalImages.map((img, index) => ({
            bookId,
            imageUrl: img.url,
            isCover: img.isCover,
            altText: img.altText || null,
            displayOrder: nextDisplayOrder + index,
          })),
        ),
      );
    }
    await db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);

    revalidatePath(`/books/${bookId}`);
    return { imagesProcessed: finalImages.length };
  },
);

export const cleanupTempFiles = staffAction(
  z.object({ fileNames: z.array(TempFileNameSchema).max(20) }),
  async ({ fileNames }) => {
    for (const fileName of fileNames) {
      await deleteFile(fileName);
    }
  },
);
