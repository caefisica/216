import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getDb } from "@/lib/db";
import { createTestDatabase, type TestDatabase } from "@/lib/db/test-database";
import { insertBook } from "@/lib/db/test-fixtures";
import * as schema from "@/lib/db/schema";
import { getBookById, getBooks, setHeart } from "./actions";
import HomePage from "@/app/page";
import ProfilePage from "@/app/profile/page";

// Session cookies, the app router and revalidation need a Next.js request, so these are the only fakes.
const current = vi.hoisted(() => ({ signedIn: true, verified: true }));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ refresh: () => {} }),
}));
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
  ({ id: bookId } = await insertBook({ title: "Libro guardado" }));
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

async function homeBooks() {
  const page = (await HomePage({ searchParams: Promise.resolve({}) })) as ReactElement<{
    children: [unknown, ReactElement<{ children: ReactElement<{ result: { items: unknown[] } }> }>];
  }>;
  return page.props.children[1].props.children.props.result.items as { isHearted: boolean }[];
}

async function savedSection() {
  const markup = renderToStaticMarkup((await ProfilePage()) as ReactElement);
  return markup.split('aria-labelledby="guardados"')[1]?.split("</section>")[0] ?? "";
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

  it("lists its favorites under Guardados on its page", async () => {
    expect(await savedSection()).toContain("Libro guardado");
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

  it("is sent away from its books page", async () => {
    await expect(ProfilePage()).rejects.toMatchObject(redirectError);
  });
});

describe("the books page refusal", () => {
  it("sends an anonymous visitor to sign in and an unverified account to verify", async () => {
    asAnonymous();
    await expect(ProfilePage()).rejects.toMatchObject({
      digest: expect.stringContaining("/auth/signin"),
    });

    current.signedIn = true;
    asUnverified();
    await expect(ProfilePage()).rejects.toMatchObject({
      digest: expect.stringContaining("/auth/verify-email"),
    });
  });
});
