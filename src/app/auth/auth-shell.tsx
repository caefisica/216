"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Page } from "@/components/ui/page";

export function AuthShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <Page width="prose" className="max-w-sm sm:pt-16">
      <h1 className="font-serif text-2xl font-semibold">{title}</h1>
      {intro && <p className="mt-2 text-muted-foreground">{intro}</p>}
      <div className="mt-6 grid gap-4">{children}</div>
    </Page>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-destructive-soft px-3 py-2 text-destructive">
      {message}
    </p>
  );
}

export function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending} aria-busy={pending}>
      {pending ? busy : idle}
    </Button>
  );
}

export const authLink =
  "inline-flex min-h-control items-center text-link underline underline-offset-2";
