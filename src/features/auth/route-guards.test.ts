import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Role } from "@/lib/db/schema";

vi.mock("@/features/books/service", async () => {
  const actual = await vi.importActual<typeof import("@/features/books/service")>(
    "@/features/books/service",
  );
  return { ...actual, getFavoriteBooksService: async () => [] };
});
vi.mock("@/features/users/repository", async () => {
  const actual = await vi.importActual<typeof import("@/features/users/repository")>(
    "@/features/users/repository",
  );
  return { ...actual, listUserActivity: async () => [] };
});

// Session cookies need a Next.js request, so the session lookup is the only fake.
const current = vi.hoisted(() => ({ role: null as Role | null, verified: true }));

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
            emailVerified: current.verified,
            role: current.role,
          },
        },
}));

/**
 * Who may call each server action; every export of every `"use server"` file must be listed.
 * `public` needs no role, `own-session` checks its own session, `authenticated` is user,
 * librarian or admin, `staff` is librarian or admin, `admin` is admin only. Guarded policies also
 * need a verified email and refuse with an error value.
 */
type ActionPolicy = "public" | "own-session" | "authenticated" | "staff" | "admin";

const actionPolicies: Record<string, ActionPolicy> = {
  "features/admin/actions.ts#getActiveLoans": "staff",
  "features/admin/actions.ts#getPendingBorrowRequests": "staff",
  "features/admin/actions.ts#getDetailedAdminStats": "staff",
  "features/admin/actions.ts#getBorrowingHistory": "staff",
  "features/admin/actions.ts#returnLoan": "staff",
  "features/admin/actions.ts#updateBorrowStatus": "staff",
  "features/auth/actions/reset-password-request.ts#requestPasswordResetAction": "public",
  "features/auth/actions/reset-password.ts#resetPasswordAction": "public",
  "features/auth/actions/session.ts#signOutAction": "own-session",
  "features/auth/actions/signin.ts#signInAction": "public",
  "features/auth/actions/signup.ts#signUpAction": "public",
  "features/auth/actions/verify-email.ts#resendVerificationEmailAction": "own-session",
  "features/auth/actions/verify-email.ts#verifyEmailAction": "own-session",
  "features/books/actions.ts#addBookImage": "staff",
  "features/books/actions.ts#addCopy": "staff",
  "features/books/actions.ts#createBook": "staff",
  "features/books/actions.ts#createBorrowRequest": "authenticated",
  "features/books/actions.ts#createDonor": "staff",
  "features/books/actions.ts#createLocation": "staff",
  "features/books/actions.ts#deleteBook": "staff",
  "features/books/actions.ts#deleteBookImage": "staff",
  "features/books/actions.ts#deleteCopy": "staff",
  "features/books/actions.ts#getBookById": "public",
  "features/books/actions.ts#getBooks": "public",
  "features/books/actions.ts#getFacets": "public",
  "features/books/actions.ts#setCoverImage": "staff",
  "features/books/actions.ts#setHeart": "authenticated",
  "features/books/actions.ts#updateBook": "staff",
  "features/books/actions.ts#updateCopy": "staff",
  "features/books/actions.ts#updateDonor": "staff",
  "features/books/actions.ts#updateLocation": "staff",
  "features/books/actions.ts#uploadBookImage": "staff",
  "features/users/actions.ts#getAllUsers": "staff",
  "features/users/actions.ts#suspendUser": "admin",
  "features/users/actions.ts#updateUserProfile": "authenticated",
  "features/users/actions.ts#updateUserRole": "admin",
};

const sources = import.meta.glob(["/src/features/**/*.ts", "!/src/**/*.test.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const loaders = import.meta.glob(["/src/features/**/*.ts", "!/src/**/*.test.ts"]) as Record<
  string,
  () => Promise<Record<string, unknown>>
>;

const actionFiles = Object.keys(sources)
  .filter((path) => /^\s*"use server";/.test(sources[path]))
  .sort();

async function actions() {
  const found: Record<string, (input?: unknown) => Promise<unknown>> = {};
  for (const path of actionFiles) {
    const exports = await loaders[path]();
    for (const [name, value] of Object.entries(exports)) {
      found[`${path.slice("/src/".length)}#${name}`] = value as never;
    }
  }
  return found;
}

const allowedRoles: Record<ActionPolicy, readonly Role[]> = {
  public: [],
  "own-session": [],
  authenticated: ["user", "librarian", "admin"],
  staff: ["librarian", "admin"],
  admin: ["admin"],
};

const IMPORT_TIMEOUT_MS = 30_000;

const callers = [
  { label: "an anonymous caller", role: null, verified: true },
  { label: "a user", role: "user", verified: true },
  { label: "an unverified user", role: "user", verified: false },
  { label: "a suspended user", role: "suspended", verified: true },
  { label: "a librarian", role: "librarian", verified: true },
  { label: "an unverified librarian", role: "librarian", verified: false },
  { label: "an admin", role: "admin", verified: true },
  { label: "an unverified admin", role: "admin", verified: false },
] as const;

function expectedRefusal(caller: (typeof callers)[number], policy: keyof typeof allowedRoles) {
  if (caller.role === null) return "unauthorized";
  if (!allowedRoles[policy].includes(caller.role)) return "forbidden";
  if (!caller.verified) return "unverified";
  return null;
}

describe("server action guards", () => {
  beforeEach(() => {
    current.role = null;
    current.verified = true;
  });

  it(
    "classifies every exported server action, and nothing else",
    async () => {
      expect(actionFiles.length).toBeGreaterThan(0);
      expect(Object.keys(await actions()).sort()).toEqual(Object.keys(actionPolicies).sort());
    },
    IMPORT_TIMEOUT_MS,
  );

  const guarded = Object.entries(actionPolicies).filter(
    ([, policy]) => policy !== "public" && policy !== "own-session",
  ) as [string, Exclude<ActionPolicy, "public" | "own-session">][];

  for (const caller of callers) {
    it(
      `applies each guard to ${caller.label}`,
      async () => {
        current.role = caller.role;
        current.verified = caller.verified;
        const found = await actions();

        for (const [key, policy] of guarded) {
          // `null` fails every input schema. A caller who clears the guard then gets "invalid",
          // which proves the guard ran before validation and before the handler.
          const result = (await found[key](null)) as {
            ok: boolean;
            error?: { code: string; message: string };
          };

          expect(result.ok, key).toBe(false);
          expect(result.error?.code, key).toBe(expectedRefusal(caller, policy) ?? "invalid");
          expect(result.error?.message, key).toMatch(/\S/);
        }
      },
      IMPORT_TIMEOUT_MS,
    );
  }
});

/** Who may open each page. Under `src/app/admin` only `staff` is acceptable. */
type PagePolicy = "public" | "signed-in" | "staff";

const pagePolicies: Record<string, PagePolicy> = {
  "/about": "public",
  "/about/location": "public",
  "/about/rules": "public",
  "/about/team": "public",
  "/admin/books/[id]": "staff",
  "/admin/books/create": "staff",
  "/auth/reset-password": "public",
  "/auth/signin": "public",
  "/auth/signup": "public",
  "/auth/verify-email": "public",
  "/books/[id]": "public",
  "/donors": "public",
  "/favorites": "signed-in",
  "/": "public",
  "/media/[...key]": "public",
  "/privacy": "public",
  "/profile": "signed-in",
  "/terms": "public",
};

const routeLoaders = import.meta.glob("/src/app/**/{page,route}.{ts,tsx,mdx}") as Record<
  string,
  () => Promise<{ default?: (props: unknown) => Promise<unknown> }>
>;

function routeOf(path: string) {
  const route = path
    .slice("/src/app".length)
    .replace(/\/(page|route)\.\w+$/, "")
    .replace(/\/$/, "");
  return route === "" ? "/" : route;
}

describe("page guards", () => {
  beforeEach(() => {
    current.role = null;
    current.verified = true;
  });

  const routes = Object.keys(routeLoaders).map((path) => [routeOf(path), path] as const);

  it("classifies every route, and nothing else", () => {
    expect(routes.map(([route]) => route).sort()).toEqual(Object.keys(pagePolicies).sort());
  });

  it("guards everything under /admin as staff only", () => {
    for (const [route] of routes) {
      if (route.startsWith("/admin")) expect(pagePolicies[route], route).toBe("staff");
    }
  });

  const redirectError = { digest: expect.stringContaining("NEXT_REDIRECT") };
  const props = { params: Promise.resolve({ id: "6f1c1a52-8f0e-4f7e-9d4b-0b7f5a3c2e11" }) };
  const redirecting = routes.filter(([route]) => pagePolicies[route] !== "public");

  for (const { label, role, verified } of callers) {
    it(
      `sends ${label} where each guarded page says`,
      async () => {
        current.role = role;
        current.verified = verified;

        for (const [route, path] of redirecting) {
          const page = (await routeLoaders[path]()).default!;
          const allowed =
            role !== null &&
            verified &&
            (pagePolicies[route] === "staff" ? role === "librarian" || role === "admin" : true);

          if (allowed) await expect(page(props), route).resolves.toBeDefined();
          else await expect(page(props), route).rejects.toMatchObject(redirectError);
        }
      },
      IMPORT_TIMEOUT_MS,
    );
  }

  it(
    "sends a signed-in page's visitor to sign in, or to verify the email",
    async () => {
      const page = (await routeLoaders["/src/app/profile/page.tsx"]()).default!;

      current.role = null;
      await expect(page(props)).rejects.toMatchObject({
        digest: expect.stringContaining("/auth/signin"),
      });

      current.role = "user";
      current.verified = false;
      await expect(page(props)).rejects.toMatchObject({
        digest: expect.stringContaining("/auth/verify-email"),
      });
    },
    IMPORT_TIMEOUT_MS,
  );
});
