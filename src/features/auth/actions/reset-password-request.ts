"use server";

import { after } from "next/server";
import { getDb } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  generatePasswordResetToken,
  issuePasswordReset,
  setPasswordResetCookie,
} from "@/features/auth/core/password-reset";
import { mailUnavailableReason } from "@/features/auth/core/mailer";

type FormState = { error: string } | { sent: true } | null;

export async function requestPasswordResetAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const db = await getDb();
  const email = formData.get("email");
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Correo electrónico inválido." };
  }

  // A missing mail setting is the same for every address, so refusing here reveals nothing about
  // which addresses are registered.
  const unavailable = await mailUnavailableReason();
  if (unavailable) {
    console.error("Password reset refused:", unavailable);
    return { error: "No podemos enviar correos por ahora. Inténtalo de nuevo más tarde." };
  }

  const rows = await db
    .select({ id: userTable.id, email: userTable.email })
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);

  // Registered and unknown addresses get the same reply and cookie. The response never waits on
  // the mail provider, although a registered address requires one more database write.
  if (rows.length > 0) {
    const user = rows[0];
    const issued = await issuePasswordReset(user.id, user.email);
    await setPasswordResetCookie(issued.token, issued.expiresAt);
    after(() => issued.delivery);
  } else {
    await setPasswordResetCookie(
      generatePasswordResetToken(),
      new Date(Date.now() + 10 * 60 * 1000),
    );
  }

  return { sent: true };
}
