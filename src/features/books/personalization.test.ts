import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { getDb } from "@/lib/db";
import { createTestDatabase, type TestDatabase } from "@/lib/db/test-database";
import { insertBook } from "@/lib/db/test-fixtures";
import * as schema from "@/lib/db/schema";
import { getBookById, getBooks, setHeart } from "./actions";
import HomePage from "@/app/page";
import FavoritesPage from "@/app/favorites/page";

// Session cookies and revalidation need a Next.js request, so these are the only fakes.
const current = vi.hoisted(() => ({ signedIn: true, verified: true }));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/features/auth/core/session", () => ({
  getCurrentSession: async () =>
    current.signedIn
      ? {
          session: { id: "s", userId: "ana", expiresAt: new Date(Date.now() + 60_000) },
          user: {
            id: "ana",
            email: "ana@x.test",
            name: "ana",
            emailVerified: current.verified,
            role: "user",
          },
        }
      : { session: null, user: null },
}));

let testDb: TestDatabase;
let bookId: string;

beforeAll(async () => {
  testDb = await createTestDatabase();
  const db = await getDb();
  await db.insert(schema.user).values({
    id: "ana",
    email: "ana@x.test",
    name: "ana",
    passwordHash: "h",
    createdAt: new Date(),
  });
  ({ id: bookId } = await insertBook());
  await db.insert(schema.userBookHearts).values({ userId: "ana", bookId });
}, 120_000);

afterAll(async () => {
  await testDb?.drop();
});

beforeEach(() => {
  current.signedIn = true;
  current.verified = true;
});

const asAnonymous = () => {
  current.signedIn = false;
};
const asUnverified = () => {
  current.verified = false;
};

/** The catalogue the home page hands to its client component. */
async function homeBooks() {
  const page = (await HomePage({ searchParams: Promise.resolve({}) })) as ReactElement<{
    children: ReactElement<{ initialPage: { items: unknown[] } }>;
  }>;
  return page.props.children.props.initialPage.items as { isHearted: boolean }[];
}

async function favoriteBooks() {
  const page = (await FavoritesPage()) as ReactElement<{ initialBooks: { id: string }[] }>;
  return page.props.initialBooks;
}

const redirectError = { digest: expect.stringContaining("NEXT_REDIRECT") };

describe("what a verified session sees", () => {
  it("sets a favorite and reads it through homeBooks, getBooks, and getBookById", async () => {
    await setHeart({ bookId, hearted: false });
    const before = await getBooks();
    expect(before.ok && before.value.items.map((b) => b.isHearted)).toEqual([false]);
    expect((await homeBooks()).map((b) => b.isHearted)).toEqual([false]);

    await setHeart({ bookId, hearted: true });
    const list = await getBooks();
    expect(list.ok && list.value.items.map((b) => b.isHearted)).toEqual([true]);

    const book = await getBookById(bookId);
    expect(book.ok && book.value.isHearted).toBe(true);

    expect((await homeBooks()).map((b) => b.isHearted)).toEqual([true]);
  });

  it("lists its favorites on the favorites page", async () => {
    expect((await favoriteBooks()).map((b) => b.id)).toEqual([bookId]);
  });
});

describe.each([
  ["an anonymous visitor", asAnonymous],
  ["an unverified account", asUnverified],
])("what %s sees", (_label, become) => {
  beforeEach(become);

  it("gets the catalogue without personal favorites", async () => {
    const list = await getBooks();
    expect(list.ok && list.value.items.map((b) => b.isHearted)).toEqual([false]);
    expect((await homeBooks()).map((b) => b.isHearted)).toEqual([false]);
  });

  it("gets a book page without personal favorites", async () => {
    const book = await getBookById(bookId);
    expect(book.ok && book.value.isHearted).toBe(false);
  });

  it("is sent away from the favorites page", async () => {
    await expect(FavoritesPage()).rejects.toMatchObject(redirectError);
  });
});

describe("the favorites page refusal", () => {
  it("sends an anonymous visitor to sign in and an unverified account to verify", async () => {
    asAnonymous();
    await expect(FavoritesPage()).rejects.toMatchObject({
      digest: expect.stringContaining("/auth/signin"),
    });

    current.signedIn = true;
    asUnverified();
    await expect(FavoritesPage()).rejects.toMatchObject({
      digest: expect.stringContaining("/auth/verify-email"),
    });
  });
});
