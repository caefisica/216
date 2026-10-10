"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Field, Input } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { signUpAction } from "@/features/auth/actions/signup";
import { AuthShell, SubmitButton, authLink } from "../auth-shell";

export default function SignUpPage() {
  const [state, formAction] = useActionState(signUpAction, null);
  // Keep these fields controlled because React clears uncontrolled fields after the action.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  return (
    <AuthShell
      title="Crear cuenta"
      intro="Con una cuenta puedes pedir libros y guardar los que te interesan."
    >
      <form action={formAction} className="grid gap-4">
        <FormError message={state?.error} />
        <Field label="Nombre">
          <Input
            name="name"
            required
            autoFocus
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="Correo">
          <Input
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
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
