"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, Input } from "@/components/ui/field";
import { signUpAction } from "@/features/auth/actions/signup";
import { AuthShell, FormError, SubmitButton, authLink } from "../auth-shell";

export default function SignUpPage() {
  const [state, formAction] = useActionState(signUpAction, null);

  return (
    <AuthShell
      title="Crear cuenta"
      intro="Con una cuenta puedes pedir libros y guardar los que te interesan."
    >
      <form action={formAction} className="grid gap-4">
        <FormError message={state?.error} />
        <Field label="Nombre">
          <Input name="name" required autoFocus autoComplete="name" />
        </Field>
        <Field label="Correo">
          <Input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Contraseña" hint="Mínimo 8 caracteres.">
          <Input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </Field>
        <SubmitButton idle="Crear cuenta" busy="Creando…" />
      </form>
      <Link href="/auth/signin" className={authLink}>
        Ya tengo cuenta
      </Link>
    </AuthShell>
  );
}
