"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { updateUserProfile } from "@/features/users/actions";
import { toast } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";

export function AccountForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = value.trim() !== name && value.trim() !== "";

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!changed) return;
    setSaving(true);
    setError(null);
    const result = await updateUserProfile({ name: value.trim() });
    setSaving(false);
    if (isErr(result)) {
      setError(result.error.message);
      return;
    }
    toast({ title: "Nombre guardado" });
    router.refresh();
  }

  return (
    <form onSubmit={save} className="grid max-w-sm gap-4">
      <Field label="Nombre" error={error ?? undefined}>
        <Input
          name="name"
          value={value}
          maxLength={100}
          autoComplete="name"
          aria-invalid={error !== null}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
        />
      </Field>
      <div className="grid gap-1.5">
        <span className="text-sm font-medium">Correo</span>
        <p className="break-all text-muted-foreground">{email}</p>
      </div>
      <div>
        <Button type="submit" variant="primary" disabled={!changed || saving}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
