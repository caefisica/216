"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { claimPasswordReset, deletePasswordResetCookie } from "@/features/auth/core/password-reset";
import { updateUserPassword } from "@/features/auth/core/session";
import { verifyPasswordStrength } from "@/features/auth/core/password";
import { isErr } from "@/lib/result";

type FormState = { error: string } | null;

export async function resetPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const code = formData.get("code");
  const password = formData.get("password");
  const confirm = formData.get("confirm");

  if (typeof code !== "string" || typeof password !== "string" || typeof confirm !== "string") {
    return { error: "Datos inválidos." };
  }
  if (!/^\d{6}$/.test(code.trim())) return { error: "El código debe tener 6 dígitos." };
  if (password !== confirm) return { error: "Las contraseñas no coinciden." };
  if (password.length < 8 || password.length > 255) {
    return { error: "La contraseña debe tener entre 8 y 255 caracteres." };
  }

  const token = (await cookies()).get("password_reset_session")?.value;
  if (!token) return { error: "No hay un restablecimiento pendiente. Solicita un código nuevo." };

  const claim = await claimPasswordReset(token, code.trim());
  if (isErr(claim)) {
    return {
      error:
        claim.error === "too_many"
          ? "Demasiados intentos. Espera unos minutos."
          : "El código es incorrecto o ha expirado.",
    };
  }

  // Check the password against the breach database before changing it.
  const strong = await verifyPasswordStrength(password);
  if (!strong)
    return { error: "Esta contraseña ha sido comprometida en brechas de datos. Elige otra." };

  await updateUserPassword(claim.value.id, password);
  await deletePasswordResetCookie();
  redirect("/auth/signin");
}
