"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, Input } from "@/components/ui/field";
import { resetPasswordAction } from "@/features/auth/actions/reset-password";
import { requestPasswordResetAction } from "@/features/auth/actions/reset-password-request";
import { AuthShell, FormError, SubmitButton, authLink } from "../auth-shell";

function NewPasswordForm() {
  const [state, formAction] = useActionState(resetPasswordAction, null);

  return (
    <AuthShell
      title="Nueva contraseña"
      intro="Si ese correo está registrado, te enviamos un código de 6 dígitos."
    >
      <form action={formAction} className="grid gap-4">
        <FormError message={state?.error} />
        <Field label="Código">
          <Input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            autoFocus
            pattern="\d{6}"
            maxLength={6}
            className="font-mono tracking-widest"
          />
        </Field>
        <Field label="Nueva contraseña" hint="Mínimo 8 caracteres.">
          <Input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Repite la contraseña">
          <Input
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </Field>
        <SubmitButton idle="Cambiar contraseña" busy="Guardando…" />
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  const [state, formAction] = useActionState(requestPasswordResetAction, null);

  if (state && "sent" in state) return <NewPasswordForm />;

  return (
    <AuthShell title="Restablecer contraseña">
      <form action={formAction} className="grid gap-4">
        <FormError message={state?.error} />
        <Field label="Correo">
          <Input name="email" type="email" required autoFocus autoComplete="email" />
        </Field>
        <SubmitButton idle="Enviar código" busy="Enviando…" />
      </form>
      <Link href="/auth/signin" className={authLink}>
        Volver a iniciar sesión
      </Link>
    </AuthShell>
  );
}
