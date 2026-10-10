import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { runSeed } from "@/lib/db/seed";
import register from "@/lib/db/seeds/catalogue.json";
import { createTestDatabase, type TestDatabase } from "@/lib/db/test-database";
import { listFacets, listBooks } from "./repository";
import { normalizeSearch, titleKey } from "./search";
import {
  addCopyService,
  createIntakeBookService,
  createDonorService,
  createLocationService,
  deleteBookService,
  deleteCopyService,
  getBookByIdService,
  getBooksService,
  updateBookService,
  updateCopyService,
  updateLocationService,
} from "./service";
import type { CopyFields } from "./schemas";
import type { BookFilters } from "./schemas";
import { createBorrowRequestService } from "./service";
import { approveRequestService } from "@/features/loans/service";

// Revalidation needs a Next.js request.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
  await runSeed(await getDb(), "seed-password");
}, 120_000);

afterAll(async () => {
  await testDb?.drop();
});

type RegisterBook = (typeof register.books)[number];
type RegisterCopy = RegisterBook["copies"][number] & { location?: string; donor?: string };

const copiesOf = (book: RegisterBook) => book.copies as RegisterCopy[];
const expected = (keep: (book: RegisterBook) => boolean) =>
  register.books
    .filter(keep)
    .map((book) => book.code)
    .sort();

async function allBooks(filters: BookFilters) {
  const items = [];
  for (let page = 1; ; page++) {
    const result = await listBooks({ ...filters, page });
    items.push(...result.items);
    if (items.length >= result.total) return items;
  }
}

async function found(filters: BookFilters) {
  return (await allBooks(filters)).map((book) => book.code).sort();
}

describe("searching the seeded catalogue", () => {
  const matches = (words: string[]) => (book: RegisterBook) => {
    const text = normalizeSearch(`${book.title} ${"author" in book ? book.author : ""}`);
    return words.every((word) => text.includes(word));
  };

  it("matches title and author regardless of case and accents", async () => {
    const wanted = expected(matches(["calculo"]));
    expect(wanted.length).toBeGreaterThan(10);

    expect(await found({ search: "calculo" })).toEqual(wanted);
    expect(await found({ search: "CÁLCULO" })).toEqual(wanted);
  });

  it("needs every word of the query", async () => {
    const wanted = expected(matches(["calculo", "vol"]));
    expect(await found({ search: "vol calculo" })).toEqual(wanted);
    expect(wanted.length).toBeLessThan(expected(matches(["calculo"])).length);
  });

  it("treats a percent sign as text, not as a wildcard", async () => {
    expect(await found({ search: "%" })).toEqual(expected(matches(["%"])));
  });

  it("finds a title by the start of its code, and by the code of one of its copies", async () => {
    expect(await found({ search: "CAFG.1.0" })).toEqual(
      expected((book) => book.code.startsWith("CAFG.1.0")),
    );
    expect(await found({ search: "cacl.1.07.2" })).toEqual(["CACL.1.07"]);
  });
});

describe("filtering the seeded catalogue", () => {
  it("filters by category, a top-level category including its subcategories", async () => {
    expect(await found({ category: "FG" })).toEqual(
      expected((book) => book.category === "FG" || book.category.startsWith("FG.")),
    );
    expect(await found({ category: "FG.1" })).toEqual(expected((book) => book.category === "FG.1"));
  });

  it("keeps only the titles with a copy to lend", async () => {
    const lendable = (book: RegisterBook) => copiesOf(book).some((c) => c.status === "present");

    const available = await found({ availability: "available" });

    expect(available).toEqual(expected(lendable));
    expect(available.length).toBeLessThan(register.books.length);
  });

  it("lists the titles with a copy that has no code on the spine or no place", async () => {
    expect(await found({ unlabelled: "1" })).toEqual(
      expected((book) => copiesOf(book).some((copy) => !copy.labelled)),
    );
    expect(await found({ unplaced: "1" })).toEqual(
      expected((book) => copiesOf(book).some((copy) => !copy.location)),
    );
  });

  it("ignores the staff filters for everyone else", async () => {
    const everything = await getBooksService({}, null);
    expect(await getBooksService({ unlabelled: "1", unplaced: "1" }, null)).toEqual(everything);
    expect((await getBooksService({ unplaced: "1" }, null, true)).total).toBeLessThan(
      everything.total,
    );
  });

  it("pages the list in title order and clamps a page past the end", async () => {
    const first = await listBooks({});
    expect(first).toMatchObject({ total: 524, page: 1, pageSize: 50 });
    expect(first.items).toHaveLength(50);

    const last = await listBooks({ page: 11 });
    expect(last.items).toHaveLength(24);
    expect(await listBooks({ page: 9999 })).toEqual(last);

    const all = await allBooks({});
    expect(new Set(all.map((book) => book.id)).size).toBe(524);
    const keys = all.map((book) => titleKey(book.title));
    expect(keys).toEqual([...keys].sort());
  });

  it("combines filters", async () => {
    expect(await found({ category: "FG", availability: "available", unplaced: "1" })).toEqual(
      expected(
        (book) =>
          book.category.startsWith("FG") &&
          copiesOf(book).some((c) => c.status === "present") &&
          copiesOf(book).some((c) => !c.location),
      ),
    );
  });

  it("sorts by title, ignoring accents, case and leading punctuation", async () => {
    const byTitle = (await allBooks({})).map((book) => normalizeSearch(book.title));
    const keys = byTitle.map((title) => titleKey(title));
    expect(keys).toEqual([...keys].sort());
    expect(byTitle.indexOf("¿a donde va la ciencia?")).toBeGreaterThan(
      byTitle.indexOf("a course of theoretical physics: vol. 2. statistical laws"),
    );
    expect(byTitle.indexOf("¿a donde va la ciencia?")).toBeLessThan(
      byTitle.indexOf("a first course in string theory"),
    );

    const [mecanica, aplicada] = ["mecanica", "mecanica aplicada: estatica"].map((title) =>
      byTitle.indexOf(title),
    );
    expect(mecanica).toBeGreaterThanOrEqual(0);
    expect(mecanica).toBeLessThan(aplicada);
  });

  it("counts a title's copies and the ones that can be lent", async () => {
    const [book] = (await listBooks({ search: "CACL.1.07" })).items;
    expect(book).toMatchObject({ code: "CACL.1.07", copyCount: 2, lendableCount: 1 });
  });
});

describe("the facets", () => {
  it("lists the category tree with the titles under each node", async () => {
    const { categories, donors } = await listFacets();

    const physics = categories.find((node) => node.code === "FG")!;
    expect(physics.children.map((child) => child.code)).toEqual([
      "FG.0",
      "FG.1",
      "FG.2",
      "FG.3",
      "FG.4",
      "FG.5",
    ]);
    expect(physics.bookCount).toBe(expected((b) => b.category.startsWith("FG")).length);
    expect(categories.reduce((sum, node) => sum + node.bookCount, 0)).toBe(register.books.length);
    expect(donors).toHaveLength(register.donors.length);
  });
});

const baseCopy: CopyFields = {
  origin: "original",
  volume: null,
  pieces: 1,
  edition: null,
  year: null,
  country: null,
  publisher: null,
  locationId: null,
  donorId: null,
  status: "present",
  condition: null,
  labelled: false,
  notes: null,
};

async function categoryId(code: string) {
  const [row] = await testDb.query<{ id: string }>(
    "SELECT id FROM categories WHERE code = ?",
    code,
  );
  return row.id;
}

describe("registering titles and copies", () => {
  it("creates the requested number of default copies in one intake", async () => {
    const result = await createIntakeBookService(
      {
        title: "Intake de prueba",
        author: "Una autora",
        isbn: null,
        description: null,
        categoryId: await categoryId("FG.4"),
      },
      3,
    );

    const copies = await testDb.query<{ code: string; location_id: string | null }>(
      "SELECT code, location_id FROM copies WHERE book_id = ? ORDER BY number",
      result.id,
    );
    expect(result.copies).toBe(3);
    expect(copies.map((copy) => copy.code)).toEqual([
      `${result.code}.1`,
      `${result.code}.2`,
      `${result.code}.3`,
    ]);
    expect(copies.every((copy) => copy.location_id !== null)).toBe(true);
  });

  it("issues consecutive title codes and never hands one out twice", async () => {
    const category = await categoryId("FG.4");
    const [{ next_number }] = await testDb.query<{ next_number: number }>(
      "SELECT next_number FROM categories WHERE id = ?",
      category,
    );
    const book = { title: "Óptica", author: null, isbn: null, description: null };

    const created = await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        createIntakeBookService({ ...book, title: `Óptica ${i}`, categoryId: category }, 1),
      ),
    );

    expect(created.map((c) => c.code).sort()).toEqual(
      Array.from({ length: 4 }, (_, i) => `CAFG.4.${String(next_number + i).padStart(2, "0")}`),
    );
  });

  it("refuses a category that has subcategories", async () => {
    await expect(
      createIntakeBookService(
        {
          title: "X",
          author: null,
          isbn: null,
          description: null,
          categoryId: await categoryId("FG"),
        },
        1,
      ),
    ).rejects.toThrow("Elige una subcategoría");
  });

  it("numbers added copies after the highest one, even after one was deleted", async () => {
    const { id } = await createIntakeBookService(
      {
        title: "Con ejemplares",
        author: null,
        isbn: null,
        description: null,
        categoryId: await categoryId("FG.4"),
      },
      1,
    );

    const second = await addCopyService(id, { ...baseCopy, origin: "copy" });
    const third = await addCopyService(id, baseCopy);
    const detail = await getBookByIdService(id);
    const secondId = detail.ok && detail.value.copies.find((c) => c.code === second.code)!.id;
    await deleteCopyService(secondId as string);
    const fourth = await addCopyService(id, baseCopy);

    expect([second.code.slice(-2), third.code.slice(-2), fourth.code.slice(-2)]).toEqual([
      ".2",
      ".3",
      ".4",
    ]);
  });

  it("refuses a copy for a title that does not exist", async () => {
    await expect(addCopyService(crypto.randomUUID(), baseCopy)).rejects.toThrow(
      "Libro no encontrado.",
    );
  });

  it("reuses a donor typed twice instead of crediting two people", async () => {
    const first = await createDonorService("Persona Nueva", "Para la sala de lectura");
    const again = await createDonorService("Persona Nueva");
    expect(again.id).toBe(first.id);
    expect(first.motivation).toBe("Para la sala de lectura");
  });

  it("creates and edits a shelf location", async () => {
    const location = await createLocationService({
      cabinet: "Prueba",
      shelf: 9,
      bay: 9,
      categoryId: null,
      holds: "extra",
    });

    const updated = await updateLocationService(location.id, {
      cabinet: "Prueba editada",
      shelf: 10,
      bay: 2,
      categoryId: null,
      holds: "primary",
    });

    expect(updated).toMatchObject({
      cabinet: "Prueba editada",
      shelf: 10,
      bay: 2,
      holds: "primary",
    });
  });
});

describe("editing", () => {
  it("clears a field the form emptied and keeps the code", async () => {
    const category = await categoryId("FG.5");
    const created = await createIntakeBookService(
      { title: "Antes", author: "Autor", isbn: "123", description: "d", categoryId: category },
      1,
    );

    await updateBookService(created.id, {
      title: "Después",
      author: null,
      isbn: null,
      description: null,
      categoryId: category,
    });

    const [row] = await testDb.query(
      "SELECT code, title, author, isbn, search, title_key FROM books WHERE id = ?",
      created.id,
    );
    expect(row).toEqual({
      code: created.code,
      title: "Después",
      author: null,
      isbn: null,
      search: "despues",
      title_key: "despues",
    });
  });

  it("reports a title that does not exist", async () => {
    await expect(
      updateBookService(crypto.randomUUID(), {
        title: "T",
        author: null,
        isbn: null,
        description: null,
        categoryId: await categoryId("FG.5"),
      }),
    ).rejects.toThrow("Libro no encontrado.");
  });

  it("changes a copy's state and place without touching its code", async () => {
    const [copy] = await testDb.query<{ id: string; code: string }>(
      "SELECT id, code FROM copies WHERE code = 'CAFG.1.05.1'",
    );
    const [place] = await testDb.query<{ id: string }>(
      "SELECT id FROM locations WHERE cabinet = 'Mueble Principal' AND shelf = 5 AND bay = 1",
    );

    await updateCopyService(copy.id, {
      ...baseCopy,
      status: "maintenance",
      condition: "poor",
      locationId: place.id,
      labelled: true,
    });

    const [row] = await testDb.query(
      "SELECT code, status, condition, location_id FROM copies WHERE id = ?",
      copy.id,
    );
    expect(row).toEqual({
      code: copy.code,
      status: "maintenance",
      condition: "poor",
      location_id: place.id,
    });
  });
});

describe("removing", () => {
  it("deletes a copy nobody borrowed, and refuses one with loan history", async () => {
    const category = await categoryId("FG.5");
    const created = await createIntakeBookService(
      { title: "Prestado", author: null, isbn: null, description: null, categoryId: category },
      1,
    );
    await addCopyService(created.id, baseCopy);
    const detail = await getBookByIdService(created.id);
    if (!detail.ok) throw new Error("title missing");
    const [first, second] = detail.value.copies;

    await testDb.db
      .prepare(
        "INSERT INTO user (id, email, name, password_hash, created_at) VALUES ('reader', 'r@x.test', 'R', 'h', 0)",
      )
      .run();
    await createBorrowRequestService(created.id, "reader", null);
    const [request] = await testDb.query<{ id: string }>(
      "SELECT id FROM borrow_requests WHERE book_id = ?",
      created.id,
    );
    await approveRequestService(request.id, first.id, "reader");

    await expect(deleteCopyService(first.id)).rejects.toThrow("Márcalo como extraviado");
    await deleteCopyService(second.id);

    const rows = await testDb.query("SELECT code FROM copies WHERE book_id = ?", created.id);
    expect(rows).toEqual([{ code: first.code }]);
  });

  it("deletes a title with its copies, loans and hearts", async () => {
    const [book] = await testDb.query<{ id: string }>(
      "SELECT book_id AS id FROM borrow_requests WHERE user_id = 'reader' LIMIT 1",
    );

    await deleteBookService(book.id);

    for (const table of ["copies", "borrow_requests", "book_images"]) {
      expect(
        await testDb.query(`SELECT 1 FROM ${table} WHERE book_id = ?`, book.id),
        table,
      ).toEqual([]);
    }
  });
});
