"use client";

import { useActionState, useState, useTransition } from "react";
import { Field, Input } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { Button } from "@/components/ui/button";
import {
  resendVerificationEmailAction,
  verifyEmailAction,
} from "@/features/auth/actions/verify-email";
import { toast } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import { AuthShell, SubmitButton } from "../auth-shell";

export default function VerifyEmailPage() {
  const [state, formAction] = useActionState(verifyEmailAction, null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resending, startTransition] = useTransition();

  return (
    <AuthShell title="Confirma tu correo" intro="Escribe el código de 6 dígitos que te enviamos.">
      <form action={formAction} className="grid gap-4">
        <FormError message={state?.error} />
        <Field label="Código">
          <Input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            className="font-mono tracking-widest"
          />
        </Field>
        <SubmitButton idle="Confirmar" busy="Confirmando…" />
      </form>
      <FormError message={resendError} />
      <div>
        <Button
          type="button"
          variant="secondary"
          disabled={resending}
          onClick={() =>
            startTransition(async () => {
              const result = await resendVerificationEmailAction();
              setResendError(isErr(result) ? result.error : null);
              if (!isErr(result)) toast({ title: "Te enviamos un código nuevo" });
            })
          }
        >
          {resending ? "Enviando…" : "Enviar otro código"}
        </Button>
      </div>
    </AuthShell>
  );
}
