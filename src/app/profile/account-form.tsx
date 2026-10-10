"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { updateUserProfile } from "@/features/users/actions";
import { toast, toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";

export function AccountForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const changed = value.trim() !== name && value.trim() !== "";

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!changed) return;
    setSaving(true);
    const result = await updateUserProfile({ name: value.trim() });
    setSaving(false);
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    toast({ title: "Nombre guardado" });
    router.refresh();
  }

  return (
    <form onSubmit={save} className="mt-2 grid max-w-sm gap-3">
      <Field label="Nombre">
        <Input
          name="name"
          value={value}
          maxLength={100}
          autoComplete="name"
          onChange={(event) => setValue(event.target.value)}
        />
      </Field>
      <p className="text-muted-foreground">{email}</p>
      <div>
        <Button type="submit" variant="primary" disabled={!changed || saving}>
          Guardar
        </Button>
      </div>
    </form>
  );
}
