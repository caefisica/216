import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { createTestDatabase, type TestDatabase } from "@/lib/db/test-database";
import { insertBook } from "@/lib/db/test-fixtures";
import * as schema from "@/lib/db/schema";
import HomePage from "@/app/page";
import DonorsPage from "@/app/donors/page";
import ProfilePage from "@/app/profile/page";
import { LoanHistory } from "@/app/profile/loan-history";
import type { BorrowRequest } from "@/features/users/types";
import type { LibraryCounts } from "./types";

const current = vi.hoisted(() => ({ role: "user" as "user" | "librarian" }));

// Session cookies need a Next.js request, so the session lookup is the only fake.
vi.mock("@/features/auth/core/session", () => ({
  getCurrentSession: async () => ({
    session: { id: "s", userId: "reader-1", expiresAt: new Date(Date.now() + 60_000) },
    user: {
      id: "reader-1",
      email: "reader@example.com",
      name: "Reader",
      emailVerified: true,
      role: current.role,
    },
  }),
}));

let testDb: TestDatabase;

function donorNames(page: unknown) {
  return [...renderedText(page).matchAll(/Donante (\w+)/g)].map((match) => match[1]);
}

function renderedText(value: unknown, seen = new Set<object>()): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (!value || typeof value !== "object" || seen.has(value)) return "";
  seen.add(value);
  return Object.values(value)
    .map((child) => renderedText(child, seen))
    .join(" ");
}

beforeAll(async () => {
  testDb = await createTestDatabase();
  const db = await getDb();
  await db.insert(schema.donors).values([
    { id: "donor-wide", name: "Donante Ancho" },
    { id: "donor-deep", name: "Donante Hondo" },
    { id: "donor-empty", name: "Donante Vacio" },
  ]);
  await insertBook({ title: "Uno", copies: [{ donorId: "donor-wide" }] });
  await insertBook({ title: "Dos", copies: [{ donorId: "donor-wide" }] });
  await insertBook({ title: "Tres", copies: [{ donorId: "donor-wide" }] });
  await insertBook({
    title: "Cuatro",
    copies: [{ donorId: "donor-deep" }, { donorId: "donor-deep" }],
  });

  await db.insert(schema.user).values({
    id: "reader-1",
    email: "reader@example.com",
    name: "Reader",
    passwordHash: "hash",
    emailVerified: true,
    createdAt: new Date(),
  });
  const lent = await insertBook({ title: "Prestado", copies: 1 });
  const wanted = await insertBook({ title: "Esperado", copies: 1 });
  const refused = await insertBook({ title: "Negado", copies: 1 });
  await db.insert(schema.borrowRequests).values([
    {
      userId: "reader-1",
      bookId: lent.id,
      copyId: lent.copies[0].id,
      status: "approved",
      approvedDate: new Date(),
      dueDate: new Date("2026-10-23T00:00:00.000Z"),
    },
    { userId: "reader-1", bookId: wanted.id, status: "pending" },
    { userId: "reader-1", bookId: refused.id, status: "rejected" },
  ]);
}, 120_000);

afterAll(async () => {
  await testDb?.drop();
});

describe("home page counts", () => {
  async function homeCounts() {
    type Catalogue = ReactElement<{ counts: LibraryCounts | null }>;
    const page = (await HomePage({ searchParams: Promise.resolve({}) })) as ReactElement<{
      children: Catalogue | ReactElement<{ catalogue: Catalogue }>;
    }>;
    const child = page.props.children;
    const catalogue = "catalogue" in child.props ? child.props.catalogue : child;
    return (catalogue as Catalogue).props.counts;
  }

  it("gives a reader the titles, copies and what is available now", async () => {
    current.role = "user";
    await expect(homeCounts()).resolves.toEqual({ titleCount: 7, copyCount: 8, availableNow: 7 });
  });

  it("gives staff the dashboard instead of the counts", async () => {
    current.role = "librarian";
    await expect(homeCounts()).resolves.toBeNull();
  });
});

describe("donors page", () => {
  it("lists only donors with copies, ordered by total copies and not by their largest title", async () => {
    const page = await DonorsPage();

    expect(donorNames(page)).toEqual(["Ancho", "Hondo"]);
    expect(renderedText(page)).not.toContain("Vacio");
  });
});

describe("profile loan history", () => {
  async function history() {
    const page = (await ProfilePage()) as ReactElement<{ borrowHistory: BorrowRequest[] }>;
    return renderToStaticMarkup(
      createElement(LoanHistory, { borrowHistory: page.props.borrowHistory }),
    );
  }

  it("shows the copy bound to a loan and its due date", async () => {
    const html = await history();

    expect(html).toContain("Prestado");
    expect(html).toMatch(/CATT\d+\.1/);
    expect(html).toContain(new Date("2026-10-23T00:00:00.000Z").toLocaleDateString());
  });

  it("reads a pending request as waiting for a copy and a rejected one as rejected", async () => {
    const html = await history();
    const row = (title: string) => html.split("<tr").find((tr) => tr.includes(title)) ?? "";

    expect(row("Esperado")).toContain("Pendiente de asignar");
    expect(row("Negado")).toContain("Rechazado");
    expect(row("Negado")).toContain("Solicitud rechazada");
    expect(row("Negado")).not.toContain("Pendiente de asignar");
  });
});
