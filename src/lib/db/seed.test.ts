import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getDb } from "./index";
import { runSeed } from "./seed";
import register from "./seeds/catalogue.json";
import { createTestDatabase, type TestDatabase } from "./test-database";
import { createIntakeBookService, createBorrowRequestService } from "@/features/books/service";
import { listActiveLoans, listPendingRequests } from "@/features/loans/repository";
import { approveRequestService, returnLoanService } from "@/features/loans/service";

// Revalidation needs a Next.js request.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

let testDb: TestDatabase;

const everything = { limit: 100, offset: 0 };

const count = async (table: string) =>
  (await testDb.query<{ n: number }>(`SELECT count(*) AS n FROM ${table}`))[0].n;

beforeAll(async () => {
  testDb = await createTestDatabase();
  await runSeed(await getDb(), "seed-password");
}, 120_000);

afterAll(async () => {
  await testDb?.drop();
});

describe("the seed on an empty database", () => {
  it("loads the whole register", async () => {
    expect({
      books: await count("books"),
      copies: await count("copies"),
      locations: await count("locations"),
      donors: await count("donors"),
      categories: await count("categories"),
      accounts: await count("user"),
    }).toEqual({
      books: 524,
      copies: 579,
      locations: 28,
      donors: 40,
      categories: 36,
      accounts: 3,
    });
    expect(register.books).toHaveLength(524);
  });

  it("keeps the copy with its place, donor, state and the notes the librarians wrote", async () => {
    const [copy] = await testDb.query(
      `SELECT c.code, c.number, c.origin, c.status, c.edition, c.publisher, c.country, c.notes,
              b.title, d.name AS donor, l.cabinet, l.shelf, l.bay, l.holds, cat.code AS location_category
       FROM copies c
       JOIN books b ON b.id = c.book_id
       JOIN donors d ON d.id = c.donor_id
       JOIN locations l ON l.id = c.location_id
       JOIN categories cat ON cat.id = l.category_id
       WHERE c.code = ?`,
      "CACL.1.07.2",
    );
    expect(copy).toEqual({
      code: "CACL.1.07.2",
      number: 2,
      origin: "copy",
      status: "missing",
      edition: "3",
      publisher: "Editorial Thales",
      country: "Perú",
      notes: "Anillado",
      title: "Tópicos de Cálculo: Volumen 1",
      donor: "Robert Guzman",
      cabinet: "Mueble marron",
      shelf: 0,
      bay: 1,
      holds: "extra",
      location_category: "CL",
    });
  });

  it("files a title under its subcategory and the subcategory under its category", async () => {
    const [row] = await testDb.query(
      `SELECT b.code, b.author, sub.code AS sub, top.code AS top, l.cabinet, l.shelf, l.bay
       FROM books b
       JOIN categories sub ON sub.id = b.category_id
       JOIN categories top ON top.id = sub.parent_id
       JOIN copies c ON c.book_id = b.id
       JOIN locations l ON l.id = c.location_id
       WHERE b.code = ?`,
      "CAFG.1.05",
    );
    expect(row).toEqual({
      code: "CAFG.1.05",
      author: "Rodriguez V.",
      sub: "FG.1",
      top: "FG",
      cabinet: "Mueble Principal",
      shelf: 5,
      bay: 2,
    });
  });

  it("gives every copy the code of its title and its number, and no two the same", async () => {
    expect(
      await testDb.query(
        "SELECT c.code FROM copies c JOIN books b ON b.id = c.book_id WHERE c.code != b.code || '.' || c.number",
      ),
    ).toEqual([]);
  });

  it("leaves every counter ahead of the codes already issued", async () => {
    const titles = await testDb.query<{ code: string; category: string; next_number: number }>(
      "SELECT b.code, c.code AS category, c.next_number FROM books b JOIN categories c ON c.id = b.category_id",
    );
    const behind = titles.filter(({ code, category, next_number }) => {
      const issued = Number(code.slice("CA".length + category.length).replace(/^\./, ""));
      return !(issued < next_number);
    });
    expect(behind).toEqual([]);

    const copyBehind = await testDb.query(
      `SELECT b.code FROM books b
       WHERE b.next_copy <= (SELECT max(number) FROM copies WHERE book_id = b.id)`,
    );
    expect(copyBehind).toEqual([]);
  });

  it("holds credit lines and nothing else about a donor", async () => {
    const columns = await testDb.query<{ name: string }>("PRAGMA table_info(donors)");
    expect(columns.map((c) => c.name).sort()).toEqual([
      "created_at",
      "id",
      "motivation",
      "name",
      "updated_at",
    ]);
    expect(JSON.stringify(register.donors)).not.toMatch(/@|\d{6,}/);
  });

  it("changes nothing when it runs again, and keeps what the librarians edited meanwhile", async () => {
    await testDb.db.prepare("UPDATE books SET title = 'Corregido' WHERE code = 'CAFG.1.05'").run();
    const before = [await count("books"), await count("copies"), await count("donors")];

    await runSeed(await getDb(), "seed-password");

    expect([await count("books"), await count("copies"), await count("donors")]).toEqual(before);
    expect(await count("user")).toBe(3);
    const [book] = await testDb.query<{ title: string }>(
      "SELECT title FROM books WHERE code = 'CAFG.1.05'",
    );
    expect(book.title).toBe("Corregido");
  });
});

describe("a loan against a seeded copy", () => {
  it("binds to the copy a librarian approves and frees it on return", async () => {
    const users = await testDb.query<{ id: string; email: string }>("SELECT id, email FROM user");
    const id = (email: string) => users.find((u) => u.email === email)!.id;
    const [book] = await testDb.query<{ id: string }>(
      "SELECT id FROM books WHERE code = 'CAFG.1.05'",
    );

    await createBorrowRequestService(book.id, id("student@unmsm.edu.pe"), null);
    const [request] = await testDb.query<{ id: string }>(
      "SELECT id FROM borrow_requests WHERE book_id = ?",
      book.id,
    );
    const [pending] = await listPendingRequests(everything);
    expect(pending.id).toBe(request.id);
    await approveRequestService(
      request.id,
      pending.lendableCopies[0].id,
      id("librarian@unmsm.edu.pe"),
    );

    const loans = await listActiveLoans(everything);
    expect(loans).toHaveLength(1);
    expect(loans[0]).toMatchObject({
      book: { code: "CAFG.1.05" },
      copy: { code: "CAFG.1.05.1" },
    });

    await expect(
      createBorrowRequestService(book.id, id("admin@unmsm.edu.pe"), null),
    ).rejects.toThrow("El libro no está disponible.");

    await returnLoanService(request.id);
    expect(await listActiveLoans(everything)).toEqual([]);
  });

  it("does not offer a missing copy for loan", async () => {
    const [book] = await testDb.query<{ id: string; code: string }>(
      `SELECT b.id, b.code FROM books b
       WHERE EXISTS (SELECT 1 FROM copies WHERE book_id = b.id AND status = 'missing')
         AND NOT EXISTS (SELECT 1 FROM copies WHERE book_id = b.id AND status = 'present')
       LIMIT 1`,
    );
    const [student] = await testDb.query<{ id: string }>(
      "SELECT id FROM user WHERE email = 'student@unmsm.edu.pe'",
    );

    await expect(createBorrowRequestService(book.id, student.id, null)).rejects.toThrow(
      "El libro no está disponible.",
    );
  });
});

describe("adding a title after the seed", () => {
  it("takes the next free code of its subcategory", async () => {
    const [category] = await testDb.query<{ id: string; next_number: number }>(
      "SELECT id, next_number FROM categories WHERE code = 'FG.1'",
    );

    const created = await createIntakeBookService(
      { title: "Nuevo", author: null, isbn: null, description: null, categoryId: category.id },
      1,
    );

    expect(created.code).toBe(`CAFG.1.${String(category.next_number).padStart(2, "0")}`);
    expect(created.copyCode).toBe(`${created.code}.1`);
  });
});
