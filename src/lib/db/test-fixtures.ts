import { eq } from "drizzle-orm";
import { getDb } from "./index";
import * as schema from "./schema";
import { derivedTitleColumns } from "@/features/books/search";

type CopyOverrides = Partial<typeof schema.copies.$inferInsert>;

let sequence = 0;

async function testCategory() {
  const db = await getDb();
  await db
    .insert(schema.categories)
    .values({ code: "TT", name: "Test category" })
    .onConflictDoNothing();
  const [category] = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.code, "TT"));
  return category;
}

/** Inserts a title in the throwaway category and returns its copies with the supplied overrides. */
export async function insertBook(
  options: {
    title?: string;
    author?: string | null;
    copies?: CopyOverrides[] | number;
  } = {},
) {
  const db = await getDb();
  const category = await testCategory();
  const { title = "T", author = "A" } = options;
  const wanted =
    typeof options.copies === "number"
      ? Array.from({ length: options.copies }, (): CopyOverrides => ({}))
      : (options.copies ?? [{}]);

  sequence += 1;
  const code = `CATT${sequence}`;
  const [book] = await db
    .insert(schema.books)
    .values({
      code,
      categoryId: category.id,
      title,
      author,
      ...derivedTitleColumns(title, author),
      nextCopy: wanted.length + 1,
    })
    .returning();

  const created = wanted.length
    ? await db
        .insert(schema.copies)
        .values(
          wanted.map((copy, index) => ({
            ...copy,
            bookId: book.id,
            number: index + 1,
            code: `${code}.${index + 1}`,
          })),
        )
        .returning()
    : [];

  return { ...book, copies: created };
}
