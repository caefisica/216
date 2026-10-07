import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verifyPasswordHash } from "@/features/auth/core/password";
import { createAdmin } from "./admin";
import { getDb } from "./index";
import * as schema from "./schema";
import { createTestDatabase, type TestDatabase } from "./test-database";

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
}, 120_000);

afterAll(async () => {
  await testDb?.drop();
});

async function findUser(email: string) {
  const db = await getDb();
  const [row] = await db.select().from(schema.user).where(eq(schema.user.email, email));
  return row;
}

describe("createAdmin", () => {
  it("creates a verified admin whose password signs in", async () => {
    const db = await getDb();
    expect(await createAdmin(db, { email: "a@x.test", name: "A", password: "s3cret pass" })).toBe(
      "created",
    );

    const row = await findUser("a@x.test");
    expect(row).toMatchObject({ name: "A", role: "admin", emailVerified: true });
    expect(await verifyPasswordHash(row.passwordHash, "s3cret pass")).toBe(true);
  });

  it("promotes an existing account and keeps its password and name", async () => {
    const db = await getDb();
    await db.insert(schema.user).values({
      id: "u1",
      email: "b@x.test",
      passwordHash: "stored",
      name: "B",
      createdAt: new Date(),
    });

    expect(await createAdmin(db, { email: "b@x.test" })).toBe("promoted");

    expect(await findUser("b@x.test")).toMatchObject({
      name: "B",
      passwordHash: "stored",
      role: "admin",
      emailVerified: true,
    });
  });

  it("changes the password of a promoted account only when one is given", async () => {
    const db = await getDb();
    await createAdmin(db, { email: "b@x.test", password: "new password" });

    const row = await findUser("b@x.test");
    expect(await verifyPasswordHash(row.passwordHash, "new password")).toBe(true);
  });

  it("refuses to create an account without a name and a password", async () => {
    const db = await getDb();
    await expect(createAdmin(db, { email: "c@x.test", password: "pw" })).rejects.toThrow(
      "No account has the email c@x.test",
    );
    expect(await findUser("c@x.test")).toBeUndefined();
  });
});
