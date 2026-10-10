"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Page, PageTitle } from "@/components/ui/page";

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
      <PageTitle>{title}</PageTitle>
      {intro && <p className="mt-2 text-muted-foreground">{intro}</p>}
      <div className="mt-6 grid gap-5">{children}</div>
    </Page>
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
  "inline-flex min-h-control items-center rounded-xs text-accent underline underline-offset-2";
