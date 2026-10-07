import { encodeBase32LowerCaseNoPadding } from "@oslojs/encoding";
import { cookies } from "next/headers";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { emailVerificationRequest as evTable } from "@/lib/db/schema";
import { setUserEmailVerified } from "@/features/auth/core/session";
import { Ok, Err, isErr, type Result } from "@/lib/result";
import { ExpiringTokenBucket } from "./rate-limit";
import { generateOTP } from "./otp";
import { sendVerificationEmail } from "./mailer";

export interface EmailVerificationRequest {
  id: string;
  userId: string;
  email: string;
  code: string;
  expiresAt: Date;
}

export const sendVerificationEmailBucket = new ExpiringTokenBucket<string>(3, 60 * 10);

export async function createEmailVerificationRequest(
  userId: string,
  email: string,
): Promise<EmailVerificationRequest> {
  const db = await getDb();
  const idBytes = new Uint8Array(20);
  crypto.getRandomValues(idBytes);
  const id = encodeBase32LowerCaseNoPadding(idBytes);
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(evTable).values({ id, userId, email, code, expiresAt });
  return { id, userId, email, code, expiresAt };
}

/**
 * Earlier requests stay valid until the new code is sent. A failed send deletes only the new
 * request, so the user's current code and cookie continue to work.
 */
export async function issueEmailVerification(
  userId: string,
  email: string,
  send: typeof sendVerificationEmail = sendVerificationEmail,
): Promise<Result<EmailVerificationRequest, "mail_failed">> {
  const request = await createEmailVerificationRequest(userId, email);
  const db = await getDb();
  try {
    await send(request.email, request.code);
  } catch (error) {
    console.error("Could not send the verification email:", error);
    await db.delete(evTable).where(eq(evTable.id, request.id));
    return Err("mail_failed");
  }
  await db.delete(evTable).where(and(eq(evTable.userId, userId), ne(evTable.id, request.id)));
  return Ok(request);
}

export async function getEmailVerificationRequest(
  userId: string,
  id: string,
): Promise<Result<EmailVerificationRequest, "not_found">> {
  const db = await getDb();
  const rows = await db.select().from(evTable).where(eq(evTable.id, id)).limit(1);
  if (rows.length === 0) return Err("not_found");
  const r = rows[0];
  if (r.userId !== userId) return Err("not_found");
  return Ok({ id: r.id, userId: r.userId, email: r.email, code: r.code, expiresAt: r.expiresAt });
}

export async function deleteUserEmailVerificationRequests(userId: string): Promise<void> {
  const db = await getDb();
  await db.delete(evTable).where(eq(evTable.userId, userId));
}

export async function verifyEmailCode(
  userId: string,
  requestId: string,
  code: string,
): Promise<Result<void, "not_found" | "expired" | "invalid_code">> {
  const r = await getEmailVerificationRequest(userId, requestId);
  if (isErr(r)) return Err("not_found");

  if (Date.now() >= r.value.expiresAt.getTime()) {
    await deleteUserEmailVerificationRequests(userId);
    return Err("expired");
  }

  if (r.value.code !== code) return Err("invalid_code");

  await deleteUserEmailVerificationRequests(userId);
  await setUserEmailVerified(userId);
  return Ok(undefined);
}

export async function setEmailVerificationCookie(
  requestId: string,
  expiresAt: Date,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("email_verification", requestId, {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
  });
}

export async function deleteEmailVerificationCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("email_verification", "", {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
  });
}
