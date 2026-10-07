import { describe, expect, it } from "vitest";
import { getFileUrl } from "@/lib/storage";
import {
  AddBookImageSchema,
  BookFieldsSchema,
  BorrowRequestSchema,
  ImageUploadSchema,
  MAX_IMAGE_BYTES,
  SearchSchema,
} from "./schemas";

const bookId = "b31b11c9-a283-4638-bef0-161d9a57537b";

describe("AddBookImageSchema", () => {
  it("accepts the URL an upload returns", () => {
    const imageUrl = getFileUrl(`book-images/${crypto.randomUUID()}.png`);

    const parsed = AddBookImageSchema.safeParse({
      bookId,
      imageUrl,
      isCover: true,
      displayOrder: 0,
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects an image that is not served by this app", () => {
    const parsed = AddBookImageSchema.safeParse({
      bookId,
      imageUrl: "https://example.com/cover.png",
      isCover: false,
      displayOrder: 0,
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects an object that is not an uploaded book image", () => {
    const name = crypto.randomUUID();
    for (const imageUrl of [
      "/media/temp/a.png",
      "/media/other-book/a.png",
      "/media/book-images/a.png",
      `/media/book-images/${name}.svg`,
      `/media/book-images/${name}.png/../x.png`,
      `/media/book-images/nested/${name}.png`,
    ]) {
      const parsed = AddBookImageSchema.safeParse({
        bookId,
        imageUrl,
        isCover: false,
        displayOrder: 0,
      });
      expect(parsed.success, imageUrl).toBe(false);
    }
  });

  it("rejects a negative or fractional display order", () => {
    for (const displayOrder of [-1, 0.5]) {
      const parsed = AddBookImageSchema.safeParse({
        bookId,
        imageUrl: getFileUrl(`book-images/${crypto.randomUUID()}.png`),
        isCover: false,
        displayOrder,
      });
      expect(parsed.success, String(displayOrder)).toBe(false);
    }
  });
});

describe("ImageUploadSchema", () => {
  const upload = (file: unknown) => {
    const form = new FormData();
    if (file !== undefined) form.append("file", file as Blob);
    return ImageUploadSchema.safeParse(form);
  };

  it("returns the file of an allowed type", () => {
    const parsed = upload(new File(["x"], "a.png", { type: "image/png" }));
    expect(parsed.success && parsed.data.name).toBe("a.png");
  });

  it("rejects a missing file, a text field and a file that is not an image", () => {
    expect(upload(undefined).success).toBe(false);
    expect(upload("not a file").success).toBe(false);
    expect(upload(new File(["<script>"], "a.html", { type: "text/html" })).success).toBe(false);
    expect(upload(new File(["<svg>"], "a.svg", { type: "image/svg+xml" })).success).toBe(false);
  });

  it("rejects a file over the size limit", () => {
    const big = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "a.png", { type: "image/png" });
    expect(upload(big).success).toBe(false);
  });
});

describe("BookFieldsSchema", () => {
  const valid = { title: "T", author: "A", status: "available" };

  it("stores empty optional text as null so an emptied field clears the column", () => {
    const parsed = BookFieldsSchema.parse({ ...valid, isbn: "", publisher: "  ", location: null });
    expect(parsed).toMatchObject({ isbn: null, publisher: null, location: null, pages: null });
  });

  it("trims text", () => {
    expect(BookFieldsSchema.parse({ ...valid, title: "  T  " }).title).toBe("T");
  });

  it("rejects a status the database would refuse", () => {
    for (const status of ["reserved", "lost", ""]) {
      expect(BookFieldsSchema.safeParse({ ...valid, status }).success, status).toBe(false);
    }
  });

  it("rejects a blank title or author", () => {
    expect(BookFieldsSchema.safeParse({ ...valid, title: "  " }).success).toBe(false);
    expect(BookFieldsSchema.safeParse({ ...valid, author: "" }).success).toBe(false);
  });

  it("rejects counts that are not positive whole numbers", () => {
    for (const pages of [0, -3, 1.5, Number.NaN]) {
      expect(BookFieldsSchema.safeParse({ ...valid, pages }).success, String(pages)).toBe(false);
    }
  });

  it("rejects text longer than its limit", () => {
    expect(BookFieldsSchema.safeParse({ ...valid, title: "x".repeat(301) }).success).toBe(false);
  });
});

describe("BorrowRequestSchema", () => {
  it("rejects a note over 500 characters and a book id that is not a uuid", () => {
    expect(BorrowRequestSchema.safeParse({ bookId, note: "x".repeat(501) }).success).toBe(false);
    expect(BorrowRequestSchema.safeParse({ bookId: "1" }).success).toBe(false);
  });

  it("treats a blank note as none", () => {
    expect(BorrowRequestSchema.parse({ bookId, note: " " }).note).toBeNull();
  });
});

describe("SearchSchema", () => {
  it("accepts the filter values the catalogue sends", () => {
    expect(SearchSchema.safeParse({ search: "", categoryId: "all", status: "all" }).success).toBe(
      true,
    );
  });

  it("rejects an unknown status", () => {
    expect(SearchSchema.safeParse({ status: "reserved" }).success).toBe(false);
  });
});
