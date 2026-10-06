import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDatabase, type TestDatabase } from "@/lib/db/test-database";

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
  const result = testDb.sync();
  expect(result.status, result.output).toBe(0);
  process.env.DATABASE_URL = testDb.url;
}, 120_000);

afterAll(async () => {
  const { closeDb } = await import("@/lib/db");
  await closeDb();
  await testDb?.drop();
});

const failingSend = async () => {
  throw new Error("provider down");
};

async function count(table: string, where: string, value: string): Promise<number> {
  const { rows } = await testDb.client.query(
    `SELECT count(*)::int AS n FROM ${table} WHERE ${where} = $1`,
    [value],
  );
  return rows[0].n;
}

describe("registerUser", () => {
  it("creates the account and a verification request, and sends the code", async () => {
    const { registerUser } = await import("./registration");
    const send = vi.fn(async () => {});

    const result = await registerUser(
      { email: "ok@example.com", name: "Ok", password: "correct horse" },
      send,
    );

    expect(result.ok).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(await count(`"user"`, "email", "ok@example.com")).toBe(1);
  });

  it("leaves no account behind when the mail cannot be sent, so signup can be retried", async () => {
    const { registerUser } = await import("./registration");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const input = { email: "retry@example.com", name: "Retry", password: "correct horse" };

    const failed = await registerUser(input, failingSend);
    expect(failed).toMatchObject({ ok: false, error: "mail_failed" });
    expect(await count(`"user"`, "email", input.email)).toBe(0);
    expect(error).toHaveBeenCalled();
    error.mockRestore();

    const retried = await registerUser(input, async () => {});
    expect(retried.ok).toBe(true);
    expect(await count(`"user"`, "email", input.email)).toBe(1);
  });
});

describe("issueEmailVerification", () => {
  async function requestIds(userId: string): Promise<string[]> {
    const { rows } = await testDb.client.query(
      "SELECT id FROM email_verification_request WHERE user_id = $1",
      [userId],
    );
    return rows.map((row) => row.id);
  }

  it("keeps the previous request valid when the new mail cannot be sent", async () => {
    const { registerUser } = await import("./registration");
    const { issueEmailVerification } = await import("./email-verification");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const registered = await registerUser(
      { email: "resend@example.com", name: "Resend", password: "correct horse" },
      async () => {},
    );
    if (!registered.ok) throw new Error("setup failed");
    const { user, request: first } = registered.value;

    const failed = await issueEmailVerification(user.id, user.email, failingSend);
    error.mockRestore();

    expect(failed).toMatchObject({ ok: false, error: "mail_failed" });
    expect(await requestIds(user.id)).toEqual([first.id]);
  });

  it("replaces the previous request once the new mail is sent", async () => {
    const { registerUser } = await import("./registration");
    const { issueEmailVerification } = await import("./email-verification");
    const registered = await registerUser(
      { email: "replace@example.com", name: "Replace", password: "correct horse" },
      async () => {},
    );
    if (!registered.ok) throw new Error("setup failed");
    const { user, request: first } = registered.value;

    const sent = await issueEmailVerification(user.id, user.email, async () => {});

    if (!sent.ok) throw new Error("send failed");
    expect(sent.value.id).not.toBe(first.id);
    expect(await requestIds(user.id)).toEqual([sent.value.id]);
  });

  it("keeps a newer request when an older send fails", async () => {
    const { registerUser } = await import("./registration");
    const { issueEmailVerification, createEmailVerificationRequest } =
      await import("./email-verification");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const registered = await registerUser(
      { email: "newer@example.com", name: "Newer", password: "correct horse" },
      async () => {},
    );
    if (!registered.ok) throw new Error("setup failed");
    const { user, request: first } = registered.value;

    let newer: { id: string } | undefined;
    const failed = await issueEmailVerification(user.id, user.email, async () => {
      newer = await createEmailVerificationRequest(user.id, user.email);
      throw new Error("provider down");
    });
    error.mockRestore();

    expect(failed).toMatchObject({ ok: false, error: "mail_failed" });
    expect((await requestIds(user.id)).sort()).toEqual([first.id, newer?.id].sort());
  });
});

describe("issuePasswordReset", () => {
  async function registerForReset(email: string) {
    const { registerUser } = await import("./registration");
    const registered = await registerUser(
      { email, name: "Reset", password: "correct horse" },
      async () => {},
    );
    if (!registered.ok) throw new Error("setup failed");
    return registered.value.user;
  }

  it("returns before the mail is sent, so the reply does not wait on the provider", async () => {
    const { issuePasswordReset } = await import("./password-reset");
    const user = await registerForReset("slow@example.com");
    let release = () => {};
    const send = vi.fn(() => new Promise<void>((resolve) => (release = resolve)));

    const issued = await issuePasswordReset(user.id, user.email, send);

    expect(send).toHaveBeenCalledTimes(1);
    expect(await count("password_reset_session", "user_id", user.id)).toBe(1);
    release();
    await issued.delivery;
    expect(await count("password_reset_session", "user_id", user.id)).toBe(1);
  });

  it("deletes the reset session when the mail cannot be sent", async () => {
    const { issuePasswordReset } = await import("./password-reset");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const user = await registerForReset("reset@example.com");

    const issued = await issuePasswordReset(user.id, user.email, failingSend);
    await issued.delivery;

    expect(error).toHaveBeenCalled();
    error.mockRestore();
    expect(await count("password_reset_session", "user_id", user.id)).toBe(0);
  });

  it("keeps a newer session when an older send fails", async () => {
    const { issuePasswordReset, createPasswordResetSession, generatePasswordResetToken } =
      await import("./password-reset");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const user = await registerForReset("newer-reset@example.com");

    let fail = () => {};
    const older = await issuePasswordReset(
      user.id,
      user.email,
      () => new Promise<void>((_, reject) => (fail = () => reject(new Error("provider down")))),
    );
    const newer = await createPasswordResetSession(
      generatePasswordResetToken(),
      user.id,
      user.email,
    );
    fail();
    await older.delivery;
    error.mockRestore();

    const { rows } = await testDb.client.query(
      "SELECT id FROM password_reset_session WHERE user_id = $1",
      [user.id],
    );
    expect(rows).toEqual([{ id: newer.id }]);
  });
});
