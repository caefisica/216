import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { createTestDatabase, type TestDatabase } from "@/lib/db/test-database";
import { insertBook } from "@/lib/db/test-fixtures";
import * as schema from "@/lib/db/schema";
import {
  addBookImageService,
  deleteBookImageService,
  deleteBookService,
  setCoverImageService,
  uploadBookImageService,
} from "./service";

// Revalidation needs a Next.js request.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
}, 120_000);

afterAll(async () => {
  await testDb?.drop();
});

async function newBook() {
  return (await insertBook()).id;
}

async function addImage(bookId: string, isCover: boolean, displayOrder: number) {
  const file = new File(["x"], "cover.png", { type: "image/png" });
  const { url } = await uploadBookImageService(file);
  await addBookImageService({ bookId, imageUrl: url, isCover, displayOrder });
  return url;
}

async function images(bookId: string) {
  return testDb.query<{ id: string; image_url: string; is_cover: number }>(
    "SELECT id, image_url, is_cover FROM book_images WHERE book_id = ? ORDER BY display_order",
    bookId,
  );
}

async function coverUrl(bookId: string) {
  const [row] = await testDb.query<{ image_url: string | null }>(
    "SELECT image_url FROM books WHERE id = ?",
    bookId,
  );
  return row.image_url;
}

function keyOf(url: string) {
  return decodeURIComponent(url.slice("/media/".length));
}

async function stored(url: string) {
  return (await getCloudflareContext().env._216_storage.head(keyOf(url))) !== null;
}

describe("uploading", () => {
  it("names the object after its type, not after the client's file name", async () => {
    const file = new File(["x"], "../../etc/passwd me.png", { type: "image/png" });
    const { url } = await uploadBookImageService(file);

    expect(url).toMatch(/^\/media\/book-images\/[0-9a-f-]{36}\.png$/);
    expect(await stored(url)).toBe(true);
  });
});

describe("attaching an image", () => {
  it("refuses an object another book already uses, so deleting one cannot remove the other's", async () => {
    const mine = await newBook();
    const theirs = await newBook();
    const url = await addImage(theirs, true, 0);

    await expect(
      addBookImageService({ bookId: mine, imageUrl: url, isCover: true, displayOrder: 0 }),
    ).rejects.toThrow("Esa imagen ya está en uso.");

    expect(await images(mine)).toEqual([]);
    expect(await coverUrl(mine)).toBeNull();
    expect(await images(theirs)).toHaveLength(1);
  });

  it("refuses an object that was never uploaded", async () => {
    const bookId = await newBook();
    const imageUrl = `/media/book-images/${crypto.randomUUID()}.png`;

    await expect(
      addBookImageService({ bookId, imageUrl, isCover: false, displayOrder: 0 }),
    ).rejects.toThrow("La imagen no se ha subido.");
  });

  it("refuses a book that does not exist and keeps the object unattached", async () => {
    const { url } = await uploadBookImageService(new File(["x"], "a.png", { type: "image/png" }));

    await expect(
      addBookImageService({
        bookId: crypto.randomUUID(),
        imageUrl: url,
        isCover: true,
        displayOrder: 0,
      }),
    ).rejects.toThrow("Libro no encontrado.");
  });

  it("makes a new cover and the book's image agree, with one cover", async () => {
    const bookId = await newBook();
    await addImage(bookId, true, 0);
    const url = await addImage(bookId, true, 1);

    expect((await images(bookId)).map((i) => i.is_cover)).toEqual([0, 1]);
    expect(await coverUrl(bookId)).toBe(url);
  });
});

describe("cover images", () => {
  it("setting a cover moves the cover flag and the book's image", async () => {
    const bookId = await newBook();
    await addImage(bookId, true, 0);
    await addImage(bookId, false, 1);
    const [, second] = await images(bookId);

    await setCoverImageService(second.id, bookId);

    expect((await images(bookId)).map((i) => i.is_cover)).toEqual([0, 1]);
    expect(await coverUrl(bookId)).toBe(second.image_url);
  });

  it("refuses to make another book's image the cover", async () => {
    const mine = await newBook();
    const theirs = await newBook();
    await addImage(mine, true, 0);
    await addImage(theirs, true, 0);
    const [theirImage] = await images(theirs);

    await expect(setCoverImageService(theirImage.id, mine)).rejects.toThrow(
      "Imagen no encontrada.",
    );

    expect((await images(mine)).map((i) => i.is_cover)).toEqual([1]);
    expect((await images(theirs)).map((i) => i.is_cover)).toEqual([1]);
  });

  it("deleting the cover promotes the next image and removes the object", async () => {
    const bookId = await newBook();
    const coverObject = await addImage(bookId, true, 0);
    await addImage(bookId, false, 1);
    const [cover, next] = await images(bookId);

    await deleteBookImageService(cover.id, bookId);

    expect(await stored(coverObject)).toBe(false);
    expect((await images(bookId)).map((i) => [i.id, i.is_cover])).toEqual([[next.id, 1]]);
    expect(await coverUrl(bookId)).toBe(next.image_url);
  });

  it("deleting the last image clears the book's image", async () => {
    const bookId = await newBook();
    await addImage(bookId, true, 0);
    const [only] = await images(bookId);

    await deleteBookImageService(only.id, bookId);

    expect(await images(bookId)).toEqual([]);
    expect(await coverUrl(bookId)).toBeNull();
  });

  it("refuses to delete another book's image", async () => {
    const mine = await newBook();
    const theirs = await newBook();
    const object = await addImage(theirs, true, 0);
    const [theirImage] = await images(theirs);

    await expect(deleteBookImageService(theirImage.id, mine)).rejects.toThrow(
      "Imagen no encontrada.",
    );

    expect(await images(theirs)).toHaveLength(1);
    expect(await stored(object)).toBe(true);
  });

  it("deleting a book removes its objects", async () => {
    const bookId = await newBook();
    const object = await addImage(bookId, true, 0);

    await deleteBookService(bookId);

    expect(await stored(object)).toBe(false);
    expect(await images(bookId)).toEqual([]);
  });

  it("does not choke on a stored URL that is not valid percent-encoding", async () => {
    const bookId = await newBook();
    const db = await getDb();
    await db
      .insert(schema.bookImages)
      .values({ bookId, imageUrl: "/media/book-images/%E0%A4%A.png", isCover: true });
    const [image] = await images(bookId);

    await deleteBookImageService(image.id, bookId);

    expect(await images(bookId)).toEqual([]);
  });
});
