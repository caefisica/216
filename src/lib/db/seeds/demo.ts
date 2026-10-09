import type { Database } from "../index";
import * as schema from "../schema";
import { hashPassword } from "@/features/auth/core/password";

const SEED_USERS = [
  { email: "admin@unmsm.edu.pe", name: "Admin", role: "admin" as const },
  { email: "librarian@unmsm.edu.pe", name: "Librarian", role: "librarian" as const },
  { email: "student@unmsm.edu.pe", name: "Student", role: "user" as const },
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
}
