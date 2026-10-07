import { encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase32LowerCaseNoPadding } from "@oslojs/encoding";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { passwordResetSession as prsTable, user as userTable } from "@/lib/db/schema";
import { Ok, Err, isErr, type Result } from "@/lib/result";
import { ExpiringTokenBucket } from "./rate-limit";
import { generateOTP } from "./otp";
import { sendPasswordResetEmail } from "./mailer";

export interface PasswordResetSession {
  id: string;
  userId: string;
  email: string;
  code: string;
  expiresAt: Date;
}

export function generatePasswordResetToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

export async function createPasswordResetSession(
  token: string,
  userId: string,
  email: string,
): Promise<PasswordResetSession> {
  const db = await getDb();
  const id = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.delete(prsTable).where(eq(prsTable.userId, userId));
  await db.insert(prsTable).values({ id, userId, email, code, expiresAt });
  return { id, userId, email, code, expiresAt };
}

/** Wrong-code tries per account, shared by every reset session the account has. */
export const resetCodeBucket = new ExpiringTokenBucket("reset-code", 5, 60 * 10);

/**
 * The token alone proves nothing, because whoever asks for a reset receives it in a cookie. The
 * emailed code is what proves control of the address. `invalid` covers an unknown token, an expired
 * session and a wrong code alike, so the answer does not say whether the address has an account.
 */
export async function claimPasswordReset(
  token: string,
  code: string,
): Promise<Result<{ id: string }, "invalid" | "too_many">> {
  const found = await validatePasswordResetToken(token);
  if (isErr(found)) return Err("invalid");

  const { session, user } = found.value;
  if (!(await resetCodeBucket.consume(user.id))) return Err("too_many");
  if (session.code !== code) return Err("invalid");

  await resetCodeBucket.reset(user.id);
  return Ok({ id: user.id });
}

async function validatePasswordResetToken(
  token: string,
): Promise<
  Result<
    { session: PasswordResetSession; user: { id: string; email: string; name: string } },
    "not_found" | "expired"
  >
> {
  const db = await getDb();
  const id = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

  const rows = await db
    .select({
      prs: prsTable,
      user: { id: userTable.id, email: userTable.email, name: userTable.name },
    })
    .from(prsTable)
    .innerJoin(userTable, eq(prsTable.userId, userTable.id))
    .where(eq(prsTable.id, id))
    .limit(1);

  if (rows.length === 0) return Err("not_found");

  const { prs, user } = rows[0];

  if (Date.now() >= prs.expiresAt.getTime()) {
    await db.delete(prsTable).where(eq(prsTable.id, id));
    return Err("expired");
  }

  return Ok({
    session: {
      id: prs.id,
      userId: prs.userId,
      email: prs.email,
      code: prs.code,
      expiresAt: prs.expiresAt,
    },
    user,
  });
}

/**
 * `delivery` sends the code without delaying the caller. It never rejects and deletes only this
 * session if sending fails.
 */
export async function issuePasswordReset(
  userId: string,
  email: string,
  send: typeof sendPasswordResetEmail = sendPasswordResetEmail,
): Promise<{ token: string; expiresAt: Date; delivery: Promise<void> }> {
  const token = generatePasswordResetToken();
  const session = await createPasswordResetSession(token, userId, email);
  const delivery = (async () => {
    try {
      await send(email, session.code);
    } catch (error) {
      console.error("Could not send the password reset email:", error);
      const db = await getDb();
      await db.delete(prsTable).where(eq(prsTable.id, session.id));
    }
  })().catch((error) => console.error("Could not clean up the password reset session:", error));
  return { token, expiresAt: session.expiresAt, delivery };
}

export async function setPasswordResetCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("password_reset_session", token, {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
  });
}

export async function deletePasswordResetCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("password_reset_session", "", {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
  });
}
