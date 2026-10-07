"use server";

import { z } from "zod";
import { staffAction } from "@/features/auth/protected-action";
import { getDb } from "@/lib/db";
import { books, bookImages, bookCategories } from "@/lib/db/schema";
import { moveFile, deleteFile, getFileUrl, uploadFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { eq, desc } from "drizzle-orm";

const TEMP_PREFIX = "temp/";

const TempFileNameSchema = z.string().startsWith(TEMP_PREFIX);

const SaveBookSchema = z.object({
  bookId: z.uuid(),
  bookData: z.object({
    title: z.string(),
    author: z.string(),
    isbn: z.string().optional(),
    publisher: z.string().optional(),
    publicationYear: z.number().optional(),
    pages: z.number().optional(),
    description: z.string().optional(),
    status: z.string(),
    location: z.string().optional(),
    categoryId: z.string().optional(),
  }),
  uploadedImages: z.array(
    z.object({
      id: z.string(),
      fileName: TempFileNameSchema,
      isCover: z.boolean(),
      altText: z.string(),
    }),
  ),
  selectedCategories: z.array(z.string()),
});

export const uploadBookImage = staffAction(z.instanceof(FormData), async (formData) => {
  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `${TEMP_PREFIX}${crypto.randomUUID()}-${file.name}`;

  await uploadFile(fileName, buffer, file.type);
  return { success: true, url: getFileUrl(fileName), fileName };
});

async function moveImageFromTemp(tempFileName: string, bookId: string) {
  const fileExt = tempFileName.split(".").pop();
  const newFileName = `${bookId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  await moveFile(tempFileName, newFileName);
  return getFileUrl(newFileName);
}

export const saveBookWithImages = staffAction(
  SaveBookSchema,
  async ({ bookId, bookData, uploadedImages, selectedCategories }) => {
    try {
      const db = await getDb();

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

      await db
        .update(books)
        .set({ ...bookData, updatedAt: new Date() })
        .where(eq(books.id, bookId));

      if (finalImages.length > 0) {
        const existingImagesList = await db
          .select({ displayOrder: bookImages.displayOrder })
          .from(bookImages)
          .where(eq(bookImages.bookId, bookId))
          .orderBy(desc(bookImages.displayOrder))
          .limit(1);

        const nextDisplayOrder =
          existingImagesList.length > 0 ? (existingImagesList[0].displayOrder || 0) + 1 : 0;

        await db.insert(bookImages).values(
          finalImages.map((img, index) => ({
            bookId,
            imageUrl: img.url,
            isCover: img.isCover,
            altText: img.altText || null,
            displayOrder: nextDisplayOrder + index,
          })),
        );
      }

      try {
        await db.delete(bookCategories).where(eq(bookCategories.bookId, bookId));
        if (selectedCategories.length > 0) {
          await db
            .insert(bookCategories)
            .values(selectedCategories.map((categoryId) => ({ bookId, categoryId })));
        }
      } catch (categoryError) {
        console.warn("Multiple categories error:", categoryError);
      }

      revalidatePath(`/books/${bookId}`);
      return {
        success: true,
        message: "Libro actualizado correctamente",
        imagesProcessed: finalImages.length,
      };
    } catch (error) {
      console.error("Error saving book:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error inesperado",
      };
    }
  },
);

export const cleanupTempFiles = staffAction(
  z.object({ fileNames: z.array(TempFileNameSchema) }),
  async ({ fileNames }) => {
    try {
      for (const fileName of fileNames) {
        await deleteFile(fileName);
      }
      return { success: true };
    } catch (error) {
      console.error("Unexpected error cleaning up temp files:", error);
      return { success: false };
    }
  },
);
