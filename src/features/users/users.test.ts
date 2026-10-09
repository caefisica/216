import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db";
import { createTestDatabase, type TestDatabase } from "@/lib/db/test-database";
import { insertBook } from "@/lib/db/test-fixtures";
import * as schema from "@/lib/db/schema";
import { listPendingRequests } from "@/features/loans/repository";
import { listUsers } from "./repository";
import { suspendUserService, updateUserRoleService, updateUserProfileService } from "./service";

// Revalidation needs a Next.js request.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
  const db = await getDb();
  await db.insert(schema.user).values(
    ["admin", "reader"].map((id) => ({
      id,
      email: `${id}@x.test`,
      name: id,
      passwordHash: `hash-of-${id}`,
      role: id === "admin" ? ("admin" as const) : ("user" as const),
      createdAt: new Date(),
    })),
  );
}, 120_000);

afterAll(async () => {
  await testDb?.drop();
});

async function roleOf(id: string) {
  const [row] = await testDb.query<{ role: string }>("SELECT role FROM user WHERE id = ?", id);
  return row.role;
}

describe("changing roles", () => {
  it("changes another user's role", async () => {
    await updateUserRoleService("admin", "reader", "librarian");
    expect(await roleOf("reader")).toBe("librarian");
  });

  it("refuses to change the caller's own role", async () => {
    await expect(updateUserRoleService("admin", "admin", "user")).rejects.toThrow(
      "No puedes cambiar tu propio rol.",
    );
    expect(await roleOf("admin")).toBe("admin");
  });

  it("refuses to suspend the caller", async () => {
    await expect(suspendUserService("admin", "admin")).rejects.toThrow();
    expect(await roleOf("admin")).toBe("admin");
  });

  it("reports a user that does not exist instead of succeeding", async () => {
    await expect(updateUserRoleService("admin", "nobody", "user")).rejects.toThrow(
      "Usuario no encontrado.",
    );
  });

  it("suspends another user", async () => {
    await suspendUserService("admin", "reader");
    expect(await roleOf("reader")).toBe("suspended");
  });
});

describe("what staff can read about users", () => {
  it("never includes a password hash in the user list", async () => {
    const users = await listUsers();
    expect(users).toHaveLength(2);
    expect(JSON.stringify(users)).not.toContain("hash-of-");
    expect(users[0]).not.toHaveProperty("passwordHash");
  });

  it("never includes a password hash in pending loan requests", async () => {
    const db = await getDb();
    const book = await insertBook();
    await db.insert(schema.borrowRequests).values({ bookId: book.id, userId: "reader" });

    const pending = await listPendingRequests({ limit: 10, offset: 0 });
    expect(pending).toHaveLength(1);
    expect(pending[0].reader).toEqual({ name: "reader", email: "reader@x.test" });
    expect(JSON.stringify(pending)).not.toContain("hash-of-");
  });

  it("never returns a password hash from a profile update", async () => {
    const result = await updateUserProfileService("reader", "New Name");
    expect(result).toMatchObject({ id: "reader", name: "New Name" });
    expect(result).not.toHaveProperty("passwordHash");
  });
});
