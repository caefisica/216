"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Pencil, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isErr } from "@/lib/result";
import { toast, toastActionError } from "@/hooks/use-toast";
import { createDonor, createLocation, updateDonor, updateLocation } from "../actions";
import { locationLabel } from "../labels";
import type { CatalogueFacets, LocationOption } from "../types";

type ManagementFacets = CatalogueFacets & { locations: LocationOption[] };

const fieldClass =
  "h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-ring";

export function CatalogueManagement({ facets }: { facets: ManagementFacets }) {
  const router = useRouter();
  const [locationId, setLocationId] = useState<string | null>(null);
  const [locationForm, setLocationForm] = useState({
    cabinet: "",
    shelf: "1",
    bay: "1",
    categoryId: "",
    holds: "primary" as "primary" | "extra",
  });
  const [donorName, setDonorName] = useState("");
  const [donorMotivation, setDonorMotivation] = useState("");
  const [donorId, setDonorId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const categoryOptions = useMemo(
    () =>
      facets.categories.flatMap((category) =>
        category.children.length > 0
          ? [
              { ...category, label: `${category.name} · todas las subcategorías` },
              ...category.children.map((child) => ({
                ...child,
                label: `${category.name} › ${child.name}`,
              })),
            ]
          : [{ ...category, label: category.name }],
      ),
    [facets.categories],
  );

  const resetLocation = () => {
    setLocationId(null);
    setLocationForm({ cabinet: "", shelf: "1", bay: "1", categoryId: "", holds: "primary" });
  };

  const resetDonor = () => {
    setDonorId(null);
    setDonorName("");
    setDonorMotivation("");
  };

  const editDonor = (donor: ManagementFacets["donors"][number]) => {
    setDonorId(donor.id);
    setDonorName(donor.name);
    setDonorMotivation(donor.motivation ?? "");
  };

  const editLocation = (location: LocationOption) => {
    setLocationId(location.id);
    setLocationForm({
      cabinet: location.cabinet,
      shelf: String(location.shelf),
      bay: String(location.bay),
      categoryId: location.categoryId ?? "",
      holds: location.holds,
    });
  };

  async function saveLocation(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const input = {
      cabinet: locationForm.cabinet,
      shelf: Number(locationForm.shelf),
      bay: Number(locationForm.bay),
      categoryId: locationForm.categoryId || null,
      holds: locationForm.holds,
    };
    const result = locationId
      ? await updateLocation({ id: locationId, ...input })
      : await createLocation(input);
    setSaving(false);
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    toast({ title: locationId ? "Ubicación actualizada" : "Ubicación creada" });
    resetLocation();
    router.refresh();
  }

  async function saveDonor(event: React.FormEvent) {
    event.preventDefault();
    if (!donorName.trim()) return;
    setSaving(true);
    const result = donorId
      ? await updateDonor({ id: donorId, name: donorName, motivation: donorMotivation })
      : await createDonor({ name: donorName, motivation: donorMotivation });
    setSaving(false);
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    toast({ title: donorId ? "Donante actualizado" : "Donante agregado" });
    resetDonor();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(
          [
            ["En estante", facets.copyHealth.present, "text-status-available"],
            ["Mantenimiento", facets.copyHealth.maintenance, "text-primary"],
            ["Extraviados", facets.copyHealth.missing, "text-destructive"],
            ["Sin etiqueta", facets.copyHealth.unlabelled, "text-muted-foreground"],
            ["Sin ubicación", facets.copyHealth.unplaced, "text-muted-foreground"],
          ] as const
        ).map(([label, count, color]) => (
          <div key={label} className="rounded-lg border bg-surface px-3 py-2 shadow-xs">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className={`mt-1 text-xl font-bold ${color}`}>{count}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <section className="rounded-lg border bg-surface" aria-labelledby="locations-heading">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Catálogo
              </p>
              <h2 id="locations-heading" className="text-base font-semibold text-foreground">
                Ubicaciones{" "}
                <span className="font-normal text-muted-foreground">{facets.locations.length}</span>
              </h2>
            </div>
            {locationId && (
              <Button type="button" size="sm" variant="outline" onClick={resetLocation}>
                Nueva
              </Button>
            )}
          </div>

          <form
            onSubmit={saveLocation}
            className="grid gap-3 border-b bg-surface-muted/70 p-4 sm:grid-cols-2"
          >
            <div>
              <Label htmlFor="location-cabinet">Mueble</Label>
              <Input
                id="location-cabinet"
                required
                className={fieldClass}
                value={locationForm.cabinet}
                onChange={(event) =>
                  setLocationForm((form) => ({ ...form, cabinet: event.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="location-holds">Uso</Label>
              <select
                id="location-holds"
                className={fieldClass}
                value={locationForm.holds}
                onChange={(event) =>
                  setLocationForm((form) => ({
                    ...form,
                    holds: event.target.value as "primary" | "extra",
                  }))
                }
              >
                <option value="primary">Principal</option>
                <option value="extra">Copias</option>
              </select>
            </div>
            <div>
              <Label htmlFor="location-shelf">Estante</Label>
              <Input
                id="location-shelf"
                type="number"
                min="0"
                required
                className={fieldClass}
                value={locationForm.shelf}
                onChange={(event) =>
                  setLocationForm((form) => ({ ...form, shelf: event.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="location-bay">Tramo</Label>
              <Input
                id="location-bay"
                type="number"
                min="0"
                required
                className={fieldClass}
                value={locationForm.bay}
                onChange={(event) =>
                  setLocationForm((form) => ({ ...form, bay: event.target.value }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="location-category">Categoría asignada</Label>
              <select
                id="location-category"
                className={fieldClass}
                value={locationForm.categoryId}
                onChange={(event) =>
                  setLocationForm((form) => ({ ...form, categoryId: event.target.value }))
                }
              >
                <option value="">Sin categoría</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2 sm:col-span-2">
              <Button type="submit" size="sm" disabled={saving}>
                {locationId ? <Pencil /> : <Plus />}
                {locationId ? "Guardar ubicación" : "Agregar ubicación"}
              </Button>
              {locationId && (
                <Button type="button" size="sm" variant="ghost" onClick={resetLocation}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>

          <div className="max-h-80 overflow-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Ubicaciones de la biblioteca</caption>
              <thead className="sticky top-0 bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b">
                  <th scope="col" className="px-4 py-2 font-medium">
                    Lugar
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Categoría
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {facets.locations.map((location) => (
                  <tr key={location.id} className="hover:bg-accent">
                    <td className="px-4 py-2 font-medium text-foreground">
                      <MapPin className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
                      {locationLabel(location)}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {location.holds === "extra" ? "copias" : "principal"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {location.categoryCode ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => editLocation(location)}
                      >
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border bg-surface" aria-labelledby="donors-heading">
          <div className="border-b px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Créditos
            </p>
            <h2 id="donors-heading" className="text-base font-semibold text-foreground">
              Donantes{" "}
              <span className="font-normal text-muted-foreground">{facets.donors.length}</span>
            </h2>
          </div>
          <form
            onSubmit={saveDonor}
            className="grid gap-2 border-b bg-surface-muted/70 p-4 sm:grid-cols-[1fr_1fr_auto]"
          >
            <div className="min-w-0">
              <Label htmlFor="new-donor">{donorId ? "Editar donante" : "Nuevo donante"}</Label>
              <Input
                id="new-donor"
                className={fieldClass}
                placeholder="Nombre que aparecerá en el crédito"
                value={donorName}
                onChange={(event) => setDonorName(event.target.value)}
              />
            </div>
            <div className="min-w-0">
              <Label htmlFor="donor-motivation">Mensaje (opcional)</Label>
              <Input
                id="donor-motivation"
                className={fieldClass}
                value={donorMotivation}
                onChange={(event) => setDonorMotivation(event.target.value)}
              />
            </div>
            <Button type="submit" size="sm" className="mt-6" disabled={saving || !donorName.trim()}>
              <Users />
              {donorId ? "Guardar" : "Agregar"}
            </Button>
            {donorId && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="sm:col-span-3 sm:justify-self-start"
                onClick={resetDonor}
              >
                Cancelar edición
              </Button>
            )}
          </form>
          <ul className="max-h-80 divide-y overflow-auto">
            {facets.donors.map((donor) => (
              <li
                key={donor.id}
                className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
              >
                <div className="min-w-0">
                  <span className="block truncate font-medium text-foreground">{donor.name}</span>
                  {donor.motivation && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {donor.motivation}
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {donor.copyCount} {donor.copyCount === 1 ? "ejemplar" : "ejemplares"}
                </span>
                <Button type="button" size="sm" variant="ghost" onClick={() => editDonor(donor)}>
                  Editar
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
