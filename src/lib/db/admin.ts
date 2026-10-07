import { eq } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as schema from "./schema";
import { hashPassword } from "@/features/auth/core/password";

/**
 * Makes `email` a verified admin. An existing account is promoted and keeps its name; its password
 * changes only when `password` is given. A new account needs both `name` and `password`.
 */
export async function createAdmin(
  db: BaseSQLiteDatabase<"async", unknown, typeof schema>,
  input: { email: string; name?: string; password?: string },
): Promise<"created" | "promoted"> {
  const [existing] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, input.email));

  if (existing) {
    const passwordHash = input.password ? await hashPassword(input.password) : undefined;
    await db
      .update(schema.user)
      .set({ role: "admin", emailVerified: true, ...(passwordHash && { passwordHash }) })
      .where(eq(schema.user.id, existing.id));
    return "promoted";
  }

  if (!input.name || !input.password) {
    throw new Error(`No account has the email ${input.email}. Give a name and a password.`);
  }
  await db.insert(schema.user).values({
    id: crypto.randomUUID(),
    email: input.email,
    passwordHash: await hashPassword(input.password),
    name: input.name,
    emailVerified: true,
    role: "admin",
    createdAt: new Date(),
  });
  return "created";
}
