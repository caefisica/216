"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { toast, toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import { createLocation, updateLocation } from "../actions";
import { locationLabel } from "../labels";
import type { CatalogueFacets, LocationOption } from "../types";

interface LocationForm {
  cabinet: string;
  shelf: string;
  bay: string;
  categoryId: string;
  holds: "primary" | "extra";
}

const blank: LocationForm = { cabinet: "", shelf: "1", bay: "1", categoryId: "", holds: "primary" };

/** The bays of the library. New copies are placed in the bay of their category. */
export function LocationSettings({
  locations,
  categories,
}: {
  locations: LocationOption[];
  categories: CatalogueFacets["categories"];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<"new" | string | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const categoryOptions = useMemo(
    () =>
      categories.flatMap((category) =>
        category.children.length > 0
          ? [
              { id: category.id, label: `${category.name} (todas)` },
              ...category.children.map((child) => ({
                id: child.id,
                label: `${category.name} › ${child.name}`,
              })),
            ]
          : [{ id: category.id, label: category.name }],
      ),
    [categories],
  );

  const patch = (change: Partial<LocationForm>) =>
    setForm((current) => ({ ...current, ...change }));

  function edit(location: LocationOption) {
    setEditing(location.id);
    setForm({
      cabinet: location.cabinet,
      shelf: String(location.shelf),
      bay: String(location.bay),
      categoryId: location.categoryId ?? "",
      holds: location.holds,
    });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const input = {
      cabinet: form.cabinet,
      shelf: Number(form.shelf),
      bay: Number(form.bay),
      categoryId: form.categoryId || null,
      holds: form.holds,
    };
    const result =
      editing && editing !== "new"
        ? await updateLocation({ id: editing, ...input })
        : await createLocation(input);
    setSaving(false);
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    toast({ title: editing === "new" ? "Ubicación agregada" : "Ubicación guardada" });
    setEditing(null);
    router.refresh();
  }

  return (
    <section aria-labelledby="ubicaciones" className="grid gap-3">
      <div className="flex items-center justify-between gap-4">
        <h2 id="ubicaciones" className="text-lg font-semibold">
          Ubicaciones ({locations.length})
        </h2>
        {editing === null && (
          <Button
            variant="secondary"
            onClick={() => {
              setForm(blank);
              setEditing("new");
            }}
          >
            Agregar ubicación
          </Button>
        )}
      </div>

      {editing !== null && (
        <form onSubmit={save} className="grid gap-4 rounded-md bg-sunken p-4 sm:grid-cols-2">
          <Field label="Mueble">
            <Input
              required
              autoFocus
              value={form.cabinet}
              onChange={(event) => patch({ cabinet: event.target.value })}
            />
          </Field>
          <Field label="Uso">
            <Select
              value={form.holds}
              onChange={(event) => patch({ holds: event.target.value as LocationForm["holds"] })}
            >
              <option value="primary">Principal</option>
              <option value="extra">Copias</option>
            </Select>
          </Field>
          <Field label="Estante">
            <Input
              type="number"
              min="0"
              required
              value={form.shelf}
              onChange={(event) => patch({ shelf: event.target.value })}
            />
          </Field>
          <Field label="Tramo">
            <Input
              type="number"
              min="0"
              required
              value={form.bay}
              onChange={(event) => patch({ bay: event.target.value })}
            />
          </Field>
          <Field label="Categoría" className="sm:col-span-2">
            <Select
              value={form.categoryId}
              onChange={(event) => patch({ categoryId: event.target.value })}
            >
              <option value="">Sin categoría</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" variant="primary" disabled={saving}>
              Guardar
            </Button>
            <Button type="button" variant="quiet" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {locations.length === 0 ? (
        <p className="text-muted-foreground">
          Aún no hay ubicaciones. Agrega la primera para que los ejemplares nuevos tengan lugar.
        </p>
      ) : (
        <details>
          <summary className="inline-flex min-h-control items-center text-muted-foreground underline underline-offset-4">
            Mostrar las {locations.length} ubicaciones
          </summary>
          <ul className="mt-1 divide-y border-y">
            {locations.map((location) => (
              <li key={location.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p>{locationLabel(location)}</p>
                  <p className="text-xs text-muted-foreground">
                    {location.holds === "extra" ? "Copias" : "Principal"}
                    {location.categoryCode ? ` · ${location.categoryCode}` : ""}
                  </p>
                </div>
                <Button variant="quiet" onClick={() => edit(location)}>
                  Editar<span className="sr-only"> {locationLabel(location)}</span>
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
