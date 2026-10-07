"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { requestPasswordResetAction } from "@/features/auth/actions/reset-password-request";
import { resetPasswordAction } from "@/features/auth/actions/reset-password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? busy : idle}
    </Button>
  );
}

function NewPasswordForm() {
  const [state, formAction] = useActionState(resetPasswordAction, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Nueva contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-gray-600">
            Si ese correo está registrado, te enviamos un código de 6 dígitos. Escríbelo junto con
            tu nueva contraseña.
          </p>
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{state.error}</p>
            )}
            <div>
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                pattern="\d{6}"
                maxLength={6}
              />
            </div>
            <div>
              <Label htmlFor="password">Nueva contraseña</Label>
              <Input id="password" name="password" type="password" required minLength={8} />
            </div>
            <div>
              <Label htmlFor="confirm">Confirmar contraseña</Label>
              <Input id="confirm" name="confirm" type="password" required minLength={8} />
            </div>
            <SubmitButton idle="Actualizar contraseña" busy="Actualizando..." />
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">
            <Link href="/auth/signin" className="text-blue-600 hover:underline">
              Volver al inicio de sesión
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  const [state, formAction] = useActionState(requestPasswordResetAction, null);

  if (state && "sent" in state) return <NewPasswordForm />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Restablecer contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{state.error}</p>
            )}
            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" name="email" type="email" required placeholder="tu@email.com" />
            </div>
            <SubmitButton idle="Enviar código" busy="Enviando..." />
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">
            <Link href="/auth/signin" className="text-blue-600 hover:underline">
              Volver al inicio de sesión
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
