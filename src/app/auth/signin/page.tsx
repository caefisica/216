"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, Input } from "@/components/ui/field";
import { signInAction } from "@/features/auth/actions/signin";
import { AuthShell, FormError, SubmitButton, authLink } from "../auth-shell";

export default function SignInPage() {
  const [state, formAction] = useActionState(signInAction, null);

  return (
    <AuthShell title="Iniciar sesión">
      <form action={formAction} className="grid gap-4">
        <FormError message={state?.error} />
        <Field label="Correo">
          <Input name="email" type="email" required autoFocus autoComplete="email" />
        </Field>
        <Field label="Contraseña">
          <Input name="password" type="password" required autoComplete="current-password" />
        </Field>
        <SubmitButton idle="Entrar" busy="Entrando…" />
      </form>
      <div className="flex flex-wrap gap-x-4">
        <Link href="/auth/signup" className={authLink}>
          Crear cuenta
        </Link>
        <Link href="/auth/reset-password" className={authLink}>
          Olvidé mi contraseña
        </Link>
      </div>
    </AuthShell>
  );
}
