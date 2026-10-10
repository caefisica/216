"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { SectionTitle } from "@/components/ui/page";
import { toast } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import { createDonor, updateDonor } from "../actions";
import type { CatalogueFacets } from "../types";

type Donor = CatalogueFacets["donors"][number];

/** Donors are credited on /donors. The message is theirs, shown next to their name. */
export function DonorSettings({ donors }: { donors: Donor[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<"new" | string | null>(null);
  const [name, setName] = useState("");
  const [motivation, setMotivation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(donor: Donor | null) {
    setError(null);
    setEditing(donor?.id ?? "new");
    setName(donor?.name ?? "");
    setMotivation(donor?.motivation ?? "");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const result =
      editing && editing !== "new"
        ? await updateDonor({ id: editing, name, motivation })
        : await createDonor({ name, motivation });
    setSaving(false);
    if (isErr(result)) {
      setError(result.error.message);
      return;
    }
    toast({ title: editing === "new" ? "Donante agregado" : "Donante guardado" });
    setEditing(null);
    router.refresh();
  }

  return (
    <section aria-labelledby="donantes" className="grid gap-3">
      <div className="flex items-center justify-between gap-4">
        <SectionTitle id="donantes">Donantes ({donors.length})</SectionTitle>
        {editing === null && (
          <Button variant="secondary" onClick={() => open(null)}>
            Agregar donante
          </Button>
        )}
      </div>

      {editing !== null && (
        <form onSubmit={save} className="grid gap-4 rounded-md bg-sunken p-4">
          <Field label="Nombre" hint="Aparece en el crédito.">
            <Input
              required
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Mensaje" hint="Opcional.">
            <Input value={motivation} onChange={(event) => setMotivation(event.target.value)} />
          </Field>
          <FormError message={error} />
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={saving || !name.trim()}>
              Guardar
            </Button>
            <Button type="button" variant="quiet" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {donors.length === 0 ? (
        <p className="text-muted-foreground">Aún no hay donantes registrados.</p>
      ) : (
        <details>
          <summary className="inline-flex min-h-control items-center text-muted-foreground underline underline-offset-4">
            Mostrar los {donors.length} donantes
          </summary>
          <ul className="mt-1 divide-y border-y">
            {donors.map((donor) => (
              <li key={donor.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{donor.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {donor.copyCount} {donor.copyCount === 1 ? "ejemplar" : "ejemplares"}
                    {donor.motivation ? ` · ${donor.motivation}` : ""}
                  </p>
                </div>
                <Button variant="quiet" onClick={() => open(donor)}>
                  Editar<span className="sr-only"> {donor.name}</span>
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
