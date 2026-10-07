"use server";

import { redirect } from "next/navigation";
import {
  getUserFromEmail,
  generateSessionToken,
  createSession,
  setSessionTokenCookie,
} from "@/features/auth/core/session";
import { verifyPasswordHash } from "@/features/auth/core/password";
import { Throttler, RefillingTokenBucket } from "@/features/auth/core/rate-limit";
import { getClientIp } from "@/features/auth/core/client-ip";
import { isErr } from "@/lib/result";

const loginThrottler = new Throttler("login-user", [1, 2, 4, 8, 16, 30, 60, 180, 300]);
const loginIpBucket = new RefillingTokenBucket("login-ip", 20, 1);

type FormState = { error: string } | null;

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Datos de formulario inválidos." };
  }

  if (!(await loginIpBucket.consume(await getClientIp()))) {
    return { error: "Demasiados intentos. Intente más tarde." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Credenciales inválidas." };
  }

  const userResult = await getUserFromEmail(email);

  if (isErr(userResult) || !(await loginThrottler.consume(userResult.value.id))) {
    return { error: "Credenciales inválidas." };
  }
  const user = userResult.value;

  const valid = await verifyPasswordHash(user.passwordHash, password);
  if (!valid) {
    return { error: "Credenciales inválidas." };
  }

  await loginThrottler.reset(user.id);

  const token = generateSessionToken();
  const session = await createSession(token, user.id);
  await setSessionTokenCookie(token, session.expiresAt);

  redirect("/");
}
