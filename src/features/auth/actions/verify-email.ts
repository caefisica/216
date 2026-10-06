"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/features/auth/core/session";
import {
  verifyEmailCode,
  issueEmailVerification,
  sendVerificationEmailBucket,
  setEmailVerificationCookie,
  deleteEmailVerificationCookie,
} from "@/features/auth/core/email-verification";
import { Ok, Err, isErr, type Result } from "@/lib/result";

type FormState = { error: string } | null;

export async function verifyEmailAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formData.get("code");
  if (typeof raw !== "string" || !/^\d{6}$/.test(raw.trim())) {
    return { error: "Código inválido." };
  }
  const code = raw.trim();

  const { session, user } = await getCurrentSession();
  if (!session) return { error: "No has iniciado sesión." };

  const requestId = (await cookies()).get("email_verification")?.value ?? null;
  if (!requestId) return { error: "No hay verificación pendiente." };

  const result = await verifyEmailCode(user.id, requestId, code);
  if (isErr(result)) {
    const messages = {
      not_found: "La solicitud de verificación ha expirado.",
      expired: "El código ha expirado. Solicita uno nuevo.",
      invalid_code: "Código incorrecto.",
    } as const satisfies Record<typeof result.error, string>;
    if (result.error === "expired") await deleteEmailVerificationCookie();
    return { error: messages[result.error] };
  }

  await deleteEmailVerificationCookie();
  redirect("/");
}

export async function resendVerificationEmailAction(): Promise<Result<void, string>> {
  const { user } = await getCurrentSession();
  if (!user) return Err("No has iniciado sesión.");

  if (!sendVerificationEmailBucket.consume(user.id, 1)) {
    return Err("Demasiados envíos. Espera unos minutos.");
  }

  const request = await issueEmailVerification(user.id, user.email);
  if (!request.ok) return Err("No pudimos enviar el correo. Inténtalo de nuevo más tarde.");

  await setEmailVerificationCookie(request.value.id, request.value.expiresAt);
  return Ok(undefined);
}
