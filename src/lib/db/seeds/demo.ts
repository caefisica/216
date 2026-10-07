import { eq } from "drizzle-orm";
import type { Database } from "../index";
import * as schema from "../schema";
import { hashPassword } from "@/features/auth/core/password";

const SEED_USERS = [
  { email: "admin@unmsm.edu.pe", name: "Admin", role: "admin" as const },
  { email: "librarian@unmsm.edu.pe", name: "Librarian", role: "librarian" as const },
  { email: "student@unmsm.edu.pe", name: "Student", role: "user" as const },
];

const SEED_BOOKS = [
  {
    category: "Quantum Mechanics",
    title: "Principles of Quantum Mechanics",
    author: "R. Shankar",
    isbn: "978-0306447907",
    publicationYear: 1994,
    publisher: "Plenum Press",
    pages: 676,
    location: "QA-101",
  },
  {
    category: "Astrophysics",
    title: "Cosmos",
    author: "Carl Sagan",
    isbn: "978-0345539434",
    publicationYear: 2013,
    publisher: "Ballantine Books",
    pages: 432,
    location: "AP-300",
  },
];

export async function runDemoSeed(db: Database, password: string) {
  const passwordHash = await hashPassword(password);

  for (const u of SEED_USERS) {
    await db
      .insert(schema.user)
      .values({
        id: crypto.randomUUID(),
        email: u.email,
        passwordHash,
        name: u.name,
        emailVerified: true,
        role: u.role,
        createdAt: new Date(),
      })
      .onConflictDoNothing();
  }

  for (const { category, ...book } of SEED_BOOKS) {
    const [row] = await db
      .select({ id: schema.categories.id })
      .from(schema.categories)
      .where(eq(schema.categories.name, category));
    if (!row) throw new Error(`Category "${category}" is missing. Apply the migrations first.`);
    await db
      .insert(schema.books)
      .values({ ...book, categoryId: row.id, status: "available" })
      .onConflictDoNothing();
  }
}
