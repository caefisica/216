import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { cookies } from "next/headers";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  passwordResetSession as resetTable,
  session as sessionTable,
  user as userTable,
} from "@/lib/db/schema";
import { hashPassword } from "./password";
import type { Role } from "@/lib/db/schema";
import { Ok, Err, type Result } from "@/lib/result";

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  role: Role;
}

export type SessionValidationResult =
  | { session: Session; user: AuthUser }
  | { session: null; user: null };

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

export async function createSession(token: string, userId: string): Promise<Session> {
  const db = await getDb();
  const id = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessionTable).values({ id, userId, expiresAt });
  return { id, userId, expiresAt };
}

async function validateSessionToken(token: string): Promise<SessionValidationResult> {
  const db = await getDb();
  const id = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

  const rows = await db
    .select({
      session: {
        id: sessionTable.id,
        userId: sessionTable.userId,
        expiresAt: sessionTable.expiresAt,
      },
      user: {
        id: userTable.id,
        email: userTable.email,
        name: userTable.name,
        emailVerified: userTable.emailVerified,
        role: userTable.role,
      },
    })
    .from(sessionTable)
    .innerJoin(userTable, eq(sessionTable.userId, userTable.id))
    .where(eq(sessionTable.id, id))
    .limit(1);

  if (rows.length === 0) return { session: null, user: null };

  const { session: sess, user } = rows[0];

  if (Date.now() >= sess.expiresAt.getTime()) {
    await db.delete(sessionTable).where(eq(sessionTable.id, id));
    return { session: null, user: null };
  }

  if (Date.now() >= sess.expiresAt.getTime() - 15 * 24 * 60 * 60 * 1000) {
    sess.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.update(sessionTable).set({ expiresAt: sess.expiresAt }).where(eq(sessionTable.id, id));
  }

  return { session: sess, user };
}

export const getCurrentSession = cache(async (): Promise<SessionValidationResult> => {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value ?? null;
  if (token === null) return { session: null, user: null };
  return validateSessionToken(token);
});

export async function invalidateSession(sessionId: string): Promise<void> {
  const db = await getDb();
  await db.delete(sessionTable).where(eq(sessionTable.id, sessionId));
}

export async function setSessionTokenCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
  });
}

export async function deleteSessionTokenCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("session", "", {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
  });
}

export async function getUserFromEmail(
  email: string,
): Promise<Result<AuthUser & { passwordHash: string }, "not_found">> {
  const db = await getDb();
  const rows = await db.select().from(userTable).where(eq(userTable.email, email)).limit(1);
  if (rows.length === 0) return Err("not_found");
  const u = rows[0];
  return Ok({
    id: u.id,
    email: u.email,
    name: u.name,
    emailVerified: u.emailVerified,
    role: u.role,
    passwordHash: u.passwordHash,
  });
}

export async function createUser(email: string, name: string, password: string): Promise<AuthUser> {
  const db = await getDb();
  const passwordHash = await hashPassword(password);
  const id = crypto.randomUUID();
  const [u] = await db
    .insert(userTable)
    .values({ id, email, passwordHash, name, emailVerified: false, createdAt: new Date() })
    .returning({
      id: userTable.id,
      email: userTable.email,
      name: userTable.name,
      emailVerified: userTable.emailVerified,
      role: userTable.role,
    });
  return u;
}

/**
 * Signs the user out everywhere, since whoever held the old password may hold a session, and ends
 * their reset sessions, so a used code cannot set another password. One batch, so none of the
 * three happens without the others.
 */
export async function updateUserPassword(userId: string, password: string): Promise<void> {
  const db = await getDb();
  const passwordHash = await hashPassword(password);
  await db.batch([
    db.update(userTable).set({ passwordHash }).where(eq(userTable.id, userId)),
    db.delete(sessionTable).where(eq(sessionTable.userId, userId)),
    db.delete(resetTable).where(eq(resetTable.userId, userId)),
  ]);
}
