"use server";

import { getCurrentSession } from "@/features/auth/core/session";
import { getDb } from "@/lib/db";
import { books, bookImages, bookCategories } from "@/lib/db/schema";
import { moveFile, deleteFile, getFileKey, getFileUrl, uploadFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { eq, desc } from "drizzle-orm";

export async function uploadBookImage(formData: FormData) {
  const { user } = await getCurrentSession();
  if (!user) throw new Error("Unauthorized");

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `temp/${crypto.randomUUID()}-${file.name}`;

  await uploadFile(fileName, buffer, file.type);
  const url = getFileUrl(fileName);

  return { success: true, url, fileName };
}

interface MoveImageResult {
  success: boolean;
  url?: string;
  error?: string;
}

interface SaveBookData {
  bookId: string;
  bookData: {
    title: string;
    author: string;
    isbn?: string;
    publisher?: string;
    publicationYear?: number;
    pages?: number;
    description?: string;
    status: string;
    location?: string;
    categoryId?: string;
  };
  uploadedImages: Array<{
    id: string;
    fileName: string;
    isCover: boolean;
    altText: string;
  }>;
  selectedCategories: string[];
}

export async function moveImageFromTemp(
  tempFileName: string,
  bookId: string,
): Promise<MoveImageResult> {
  try {
    const { user } = await getCurrentSession();
    if (!user) return { success: false, error: "Unauthorized" };

    const fileExt = tempFileName.split(".").pop();
    const newFileName = `${bookId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    await moveFile(tempFileName, newFileName);

    return { success: true, url: getFileUrl(newFileName) };
  } catch (error) {
    console.error("Unexpected error moving file:", error);
    return { success: false, error: "Unexpected error occurred" };
  }
}

export async function saveBookWithImages(data: SaveBookData) {
  try {
    const db = await getDb();
    const { user } = await getCurrentSession();
    if (!user) throw new Error("Unauthorized");

    const { bookId, bookData, uploadedImages, selectedCategories } = data;

    const finalImages: Array<{ url: string; isCover: boolean; altText: string }> = [];

    for (const image of uploadedImages) {
      const moveResult = await moveImageFromTemp(image.fileName, bookId);
      if (moveResult.success && moveResult.url) {
        finalImages.push({
          url: moveResult.url,
          isCover: image.isCover,
          altText: image.altText || "",
        });
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
    return { success: false, error: error instanceof Error ? error.message : "Error inesperado" };
  }
}

export async function cleanupTempFiles(fileNames: string[]) {
  try {
    for (const fileName of fileNames) {
      await deleteFile(`temp/${fileName}`);
    }
    return { success: true };
  } catch (error) {
    console.error("Unexpected error cleaning up temp files:", error);
    return { success: false };
  }
}

export async function deleteBookImage(imageId: string, bookId: string) {
  try {
    const db = await getDb();
    const { user } = await getCurrentSession();
    if (!user) throw new Error("Unauthorized");

    const imageDataList = await db
      .select({ imageUrl: bookImages.imageUrl })
      .from(bookImages)
      .where(eq(bookImages.id, imageId))
      .limit(1);

    if (imageDataList.length === 0) throw new Error("Image not found");

    const key = getFileKey(imageDataList[0].imageUrl);
    if (key) await deleteFile(key);
    await db.delete(bookImages).where(eq(bookImages.id, imageId));
    revalidatePath(`/books/${bookId}`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting image:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error inesperado" };
  }
}

export async function setCoverImage(imageId: string, bookId: string, isExisting: boolean) {
  try {
    const db = await getDb();
    const { user } = await getCurrentSession();
    if (!user) throw new Error("Unauthorized");

    if (isExisting) {
      await db.update(bookImages).set({ isCover: false }).where(eq(bookImages.bookId, bookId));
      await db.update(bookImages).set({ isCover: true }).where(eq(bookImages.id, imageId));
    }

    revalidatePath(`/books/${bookId}`);
    return { success: true };
  } catch (error) {
    console.error("Error setting cover image:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error inesperado" };
  }
}
