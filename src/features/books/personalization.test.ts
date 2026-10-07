import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { getDb } from "@/lib/db";
import { createTestDatabase, type TestDatabase } from "@/lib/db/test-database";
import * as schema from "@/lib/db/schema";
import { getBookById, getBooks, getFavoriteBooks } from "./actions";
import HomePage from "@/app/page";

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
  [{ id: bookId }] = await db
    .insert(schema.books)
    .values({ title: "T", author: "A" })
    .returning({ id: schema.books.id });
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
  const page = (await HomePage()) as ReactElement<{
    children: ReactElement<{ initialBooks: unknown[] }>;
  }>;
  return page.props.children.props.initialBooks as { isHearted: boolean }[];
}

describe("what a verified session sees", () => {
  it("marks its own favorites in the catalogue, the book page and the home page", async () => {
    const list = await getBooks();
    expect(list.ok && list.value.map((b) => b.isHearted)).toEqual([true]);

    const book = await getBookById(bookId);
    expect(book.ok && book.value.isHearted).toBe(true);

    expect((await homeBooks()).map((b) => b.isHearted)).toEqual([true]);
  });

  it("lists its favorites", async () => {
    const result = await getFavoriteBooks({});
    expect(result.ok && result.value.map((b) => b.id)).toEqual([bookId]);
  });
});

describe.each([
  ["an anonymous visitor", asAnonymous],
  ["an unverified account", asUnverified],
])("what %s sees", (_label, become) => {
  beforeEach(become);

  it("gets the catalogue without personal favorites", async () => {
    const list = await getBooks();
    expect(list.ok && list.value.map((b) => b.isHearted)).toEqual([false]);
    expect((await homeBooks()).map((b) => b.isHearted)).toEqual([false]);
  });

  it("gets a book page without personal favorites", async () => {
    const book = await getBookById(bookId);
    expect(book.ok && book.value.isHearted).toBe(false);
  });

  it("is refused a favorites list, without ever reading it", async () => {
    const result = await getFavoriteBooks({});
    expect(result).toMatchObject({ ok: false });
    expect(JSON.stringify(result)).not.toContain(bookId);
  });
});

describe("the favorites list refusal", () => {
  it("tells an anonymous visitor to sign in and an unverified account to verify", async () => {
    asAnonymous();
    expect(await getFavoriteBooks({})).toMatchObject({ error: { code: "unauthorized" } });

    current.signedIn = true;
    asUnverified();
    expect(await getFavoriteBooks({})).toMatchObject({ error: { code: "unverified" } });
  });
});
