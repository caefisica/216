"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Field, Input } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { signInAction } from "@/features/auth/actions/signin";
import { AuthShell, SubmitButton, authLink } from "../auth-shell";

export default function SignInPage() {
  const [state, formAction] = useActionState(signInAction, null);
  // Keep the email controlled because React clears uncontrolled fields after the action.
  const [email, setEmail] = useState("");

  return (
    <AuthShell title="Iniciar sesión">
      <form action={formAction} className="grid gap-4">
        <FormError message={state?.error} />
        <Field label="Correo">
          <Input
            name="email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
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
