import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { createTestDatabase, type TestDatabase } from "@/lib/db/test-database";
import { insertBook } from "@/lib/db/test-fixtures";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import AboutPage from "@/app/about/page";
import BookPage from "@/app/books/[id]/page";
import DonorsPage from "@/app/donors/page";
import ProfilePage from "@/app/profile/page";
import { formatDay } from "@/features/loans/format";

// Session cookies and the app router need a Next.js request, so these are the only fakes.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));
vi.mock("@/features/auth/core/session", () => ({
  getCurrentSession: async () => ({
    session: { id: "s", userId: "reader-1", expiresAt: new Date(Date.now() + 60_000) },
    user: {
      id: "reader-1",
      email: "reader@example.com",
      name: "Reader",
      emailVerified: true,
      role: "user",
    },
  }),
}));

const DAY_MS = 24 * 60 * 60 * 1000;
const dueDate = new Date(Date.now() + 7 * DAY_MS);

let testDb: TestDatabase;

async function html(page: Promise<ReactElement | ReactNode>) {
  return renderToStaticMarkup((await page) as ReactElement);
}

/** The text of each list item that mentions a title, so one row is judged on its own. */
function row(markup: string, title: string) {
  return markup.split("<li").find((item) => item.includes(title)) ?? "";
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
  const saved = await insertBook({ title: "Guardado", copies: 1 });
  await db.insert(schema.userBookHearts).values({ userId: "reader-1", bookId: saved.id });
  await db.insert(schema.borrowRequests).values([
    {
      userId: "reader-1",
      bookId: lent.id,
      copyId: lent.copies[0].id,
      status: "approved",
      approvedDate: new Date(),
      dueDate,
    },
    { userId: "reader-1", bookId: wanted.id, status: "pending" },
    {
      userId: "reader-1",
      bookId: refused.id,
      status: "rejected",
      rejectionReason: "Solo se presta en sala",
    },
  ]);
}, 120_000);

afterAll(async () => {
  await testDb?.drop();
});

describe("about page", () => {
  it("states the titles, the copies and what is available now", async () => {
    const markup = await html(AboutPage());

    expect(markup).toContain("8 títulos en 9 ejemplares");
    expect(markup).toContain("8 están disponibles hoy");
  });
});

describe("donors page", () => {
  it("lists only donors with copies, ordered by total copies and not by their largest title", async () => {
    const markup = await html(DonorsPage());

    expect([...markup.matchAll(/Donante (\w+)/g)].map((match) => match[1])).toEqual([
      "Ancho",
      "Hondo",
    ]);
    expect(markup).not.toContain("Vacio");
  });
});

describe("book page for a reader", () => {
  const page = (id: string) => html(BookPage({ params: Promise.resolve({ id }) }));

  it("tells the reader who holds the only copy that they have it, until when", async () => {
    const [lent] = await (
      await getDb()
    )
      .select()
      .from(schema.books)
      .where(eq(schema.books.title, "Prestado"));

    const markup = await page(lent.id);

    expect(markup).toContain("No disponible");
    expect(markup).toContain(`Lo tienes prestado hasta el ${formatDay(dueDate)}`);
    expect(markup).not.toContain("Solicitar préstamo");
  });

  it("keeps showing a pending request after another reader took the last copy", async () => {
    const db = await getDb();
    await db.insert(schema.user).values({
      id: "reader-2",
      email: "other@example.com",
      name: "Other",
      passwordHash: "hash",
      emailVerified: true,
      createdAt: new Date(),
    });
    const book = await insertBook({ title: "Disputado", copies: 1 });
    await db.insert(schema.borrowRequests).values([
      {
        userId: "reader-2",
        bookId: book.id,
        copyId: book.copies[0].id,
        status: "approved",
        approvedDate: new Date(),
        dueDate,
      },
      { userId: "reader-1", bookId: book.id, status: "pending" },
    ]);

    const markup = await page(book.id);

    expect(markup).toContain("No disponible");
    expect(markup).toContain("Solicitud enviada");
  });

  it("says a loan is overdue instead of promising a return on a date that has passed", async () => {
    const db = await getDb();
    const book = await insertBook({ title: "Atrasado", copies: 2 });
    const late = new Date(Date.now() - 3.5 * 24 * 60 * 60 * 1000);
    const ahead = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    await db.insert(schema.borrowRequests).values([
      {
        userId: "reader-1",
        bookId: book.id,
        copyId: book.copies[0].id,
        status: "approved",
        approvedDate: new Date(),
        dueDate: late,
      },
      {
        userId: "reader-2",
        bookId: book.id,
        copyId: book.copies[1].id,
        status: "approved",
        approvedDate: new Date(),
        dueDate: ahead,
      },
    ]);

    const markup = await page(book.id);

    expect(markup).toContain("Lo tienes prestado, vencido hace 3 días");
    expect(markup).toContain("Prestado, vencido hace 3 días");
    expect(markup).toContain(`Vuelve hacia el ${formatDay(ahead)}`);
    expect(markup).not.toContain(`hasta el ${formatDay(late)}`);
  });

  it("gives no return date when every due date has passed", async () => {
    const db = await getDb();
    const book = await insertBook({ title: "Olvidado", copies: 1 });
    await db.insert(schema.borrowRequests).values({
      userId: "reader-2",
      bookId: book.id,
      copyId: book.copies[0].id,
      status: "approved",
      approvedDate: new Date(),
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });

    const markup = await page(book.id);

    expect(markup).toContain("Prestado, sin fecha de vuelta");
    expect(markup).not.toContain("Vuelve hacia");
  });

  it("says why a title whose copies are all out of circulation is unavailable", async () => {
    const book = await insertBook({
      title: "Perdido",
      copies: [{ status: "missing" }, { status: "maintenance" }],
    });

    const markup = await page(book.id);

    expect(markup).toContain("No disponible");
    expect(markup).toContain("Ningún ejemplar está en circulación");
    expect(markup).not.toContain("Solicitar préstamo");
  });

  it("offers the request on a title with a copy on the shelf", async () => {
    const book = await insertBook({ title: "En estante", copies: 1 });

    expect(await page(book.id)).toContain("Solicitar préstamo");
  });
});

describe("my books page", () => {
  it("tells the reader to return a lent book by its due date", async () => {
    const lent = row(await html(ProfilePage()), "Prestado");

    expect(lent).toContain(`Devuélvelo antes del ${formatDay(dueDate)}`);
  });

  it("reads a pending request as waiting and a rejected one with its reason", async () => {
    const markup = await html(ProfilePage());

    expect(row(markup, "Esperado")).toContain("Esperando respuesta");
    expect(row(markup, "Negado")).toContain("No aprobado");
    expect(row(markup, "Negado")).toContain("Solo se presta en sala");
    expect(row(markup, "Negado")).not.toContain("Esperando");
  });

  it("lists the saved books", async () => {
    expect(row(await html(ProfilePage()), "Guardado")).toContain("Guardado");
  });
});
