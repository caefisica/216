import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Role } from "@/lib/db/schema";

// Session cookies need a Next.js request, so the session lookup is the only fake.
const current = vi.hoisted(() => ({ role: null as Role | null }));

vi.mock("@/features/auth/core/session", () => ({
  getCurrentSession: async () =>
    current.role === null
      ? { session: null, user: null }
      : {
          session: { id: "s", userId: "u", expiresAt: new Date(Date.now() + 60_000) },
          user: {
            id: "u",
            email: "u@example.com",
            name: "U",
            emailVerified: true,
            role: current.role,
          },
        },
}));

const validUuid = "6f1c1a52-8f0e-4f7e-9d4b-0b7f5a3c2e11";
const formData = new FormData();
formData.append("file", new File(["x"], "x.png", { type: "image/png" }));

async function mutations(): Promise<Record<string, (input: never) => Promise<unknown>>> {
  const books = await import("@/features/books/actions");
  const editor = await import("@/features/books/actions/editor");
  const admin = await import("@/features/admin/actions");
  return {
    "books.uploadBookImage": books.uploadBookImage,
    "books.deleteBookImage": books.deleteBookImage,
    "books.setCoverImage": books.setCoverImage,
    "books.addBookImage": books.addBookImage,
    "books.deleteBook": books.deleteBook,
    "books.updateBook": books.updateBook,
    "books.createBook": books.createBook,
    "editor.uploadBookImage": editor.uploadBookImage,
    "editor.saveBookWithImages": editor.saveBookWithImages,
    "editor.cleanupTempFiles": editor.cleanupTempFiles,
    "admin.updateBorrowStatus": admin.updateBorrowStatus,
  };
}

const inputs: Record<string, unknown> = {
  "books.uploadBookImage": formData,
  "books.deleteBookImage": { imageId: validUuid, bookId: validUuid },
  "books.setCoverImage": { imageId: validUuid, bookId: validUuid, isExisting: true },
  "books.addBookImage": {
    bookId: validUuid,
    imageUrl: "/media/a.png",
    isCover: false,
    displayOrder: 0,
  },
  "books.deleteBook": { bookId: validUuid },
  "books.updateBook": { id: validUuid, title: "t", author: "a", status: "available" },
  "books.createBook": { title: "t", author: "a", status: "available" },
  "editor.uploadBookImage": formData,
  "editor.saveBookWithImages": {
    bookId: validUuid,
    bookData: { title: "t", author: "a", status: "available" },
    uploadedImages: [],
    selectedCategories: [],
  },
  "editor.cleanupTempFiles": { fileNames: ["temp/a.png"] },
  "admin.updateBorrowStatus": { requestId: validUuid, status: "approved" },
};

describe("book and loan mutations", () => {
  beforeEach(() => {
    current.role = null;
  });

  for (const [role, message] of [
    [null, /Unauthorized/],
    ["user", /Forbidden/],
    ["suspended", /Forbidden/],
  ] as const) {
    it(`refuses ${role ?? "an anonymous caller"} on every action`, async () => {
      current.role = role;
      for (const [name, action] of Object.entries(await mutations())) {
        await expect(action(inputs[name] as never), name).rejects.toThrow(message);
      }
    });
  }

  for (const role of ["librarian", "admin"] as const) {
    it(`lets ${role} past the role check`, async () => {
      current.role = role;
      for (const [name, action] of Object.entries(await mutations())) {
        // Invalid input proves the role check ran before validation.
        const error = await action({ invalid: true } as never).catch((e: unknown) => e);
        expect(String(error), name).not.toMatch(/Unauthorized|Forbidden/);
      }
    });
  }
});
