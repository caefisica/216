import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { createTestDatabase, type TestDatabase } from "@/lib/db/test-database";
import * as schema from "@/lib/db/schema";
import { verifyPasswordHash } from "./password";
import { claimPasswordReset, issuePasswordReset, resetCodeBucket } from "./password-reset";
import { createSession, generateSessionToken, updateUserPassword } from "./session";

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
  const db = await getDb();
  await db.insert(schema.user).values({
    id: "u1",
    email: "u1@x.test",
    name: "U",
    passwordHash: "old",
    createdAt: new Date(),
  });
}, 120_000);

afterAll(async () => {
  await testDb?.drop();
});

beforeEach(async () => {
  await resetCodeBucket.reset("u1");
});

async function issue() {
  let code = "";
  const { token, delivery } = await issuePasswordReset("u1", "u1@x.test", async (_to, sent) => {
    code = sent;
  });
  await delivery;
  return { token, code };
}

describe("claiming a password reset", () => {
  it("accepts the emailed code with the cookie token", async () => {
    const { token, code } = await issue();
    expect(await claimPasswordReset(token, code)).toEqual({ ok: true, value: { id: "u1" } });
  });

  it("refuses the cookie token without the emailed code", async () => {
    const { token, code } = await issue();
    const wrong = code === "000000" ? "000001" : "000000";
    expect(await claimPasswordReset(token, wrong)).toEqual({ ok: false, error: "invalid" });
    expect(await claimPasswordReset(token, "")).toEqual({ ok: false, error: "invalid" });
  });

  it("refuses a token nobody was issued, the way it refuses a wrong code", async () => {
    expect(await claimPasswordReset(generateSessionToken(), "123456")).toEqual({
      ok: false,
      error: "invalid",
    });
  });

  it("refuses the code of a session that has expired", async () => {
    const { token, code } = await issue();
    await testDb.db.prepare("UPDATE password_reset_session SET expires_at = 1").run();
    expect(await claimPasswordReset(token, code)).toEqual({ ok: false, error: "invalid" });
  });

  it("stops guessing after five wrong codes, even with the right one", async () => {
    const { token, code } = await issue();
    const wrong = code === "000000" ? "000001" : "000000";
    for (let i = 0; i < 5; i++) await claimPasswordReset(token, wrong);

    expect(await claimPasswordReset(token, code)).toEqual({ ok: false, error: "too_many" });
  });

  it("counts guesses across sessions, so asking for a new code does not reset them", async () => {
    const first = await issue();
    const wrong = first.code === "000000" ? "000001" : "000000";
    for (let i = 0; i < 5; i++) await claimPasswordReset(first.token, wrong);

    const second = await issue();
    expect(await claimPasswordReset(second.token, second.code)).toEqual({
      ok: false,
      error: "too_many",
    });
  });

  it("accepts a code once the failed tries are cleared by a success", async () => {
    const { token, code } = await issue();
    const wrong = code === "000000" ? "000001" : "000000";
    for (let i = 0; i < 4; i++) await claimPasswordReset(token, wrong);

    expect((await claimPasswordReset(token, code)).ok).toBe(true);
    for (let i = 0; i < 4; i++) await claimPasswordReset(token, wrong);
    expect((await claimPasswordReset(token, code)).ok).toBe(true);
  });
});

describe("changing a password", () => {
  it("sets the new hash and signs the user out everywhere", async () => {
    await createSession(generateSessionToken(), "u1");
    await createSession(generateSessionToken(), "u1");
    expect(await testDb.query("SELECT id FROM session WHERE user_id = 'u1'")).toHaveLength(2);

    await updateUserPassword("u1", "a brand new password");

    expect(await testDb.query("SELECT id FROM session WHERE user_id = 'u1'")).toHaveLength(0);
    const [row] = await testDb.query<{ password_hash: string }>(
      "SELECT password_hash FROM user WHERE id = 'u1'",
    );
    expect(await verifyPasswordHash(row.password_hash, "a brand new password")).toBe(true);
  });

  it("ends the user's reset sessions, so a used code cannot be used again", async () => {
    const { token, code } = await issue();
    expect((await claimPasswordReset(token, code)).ok).toBe(true);

    await updateUserPassword("u1", "another new password");

    expect(
      await testDb.query("SELECT id FROM password_reset_session WHERE user_id = 'u1'"),
    ).toEqual([]);
    expect((await claimPasswordReset(token, code)).ok).toBe(false);
  });
});
