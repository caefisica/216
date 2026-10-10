"use client";

import { useId } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { CopyCondition, CopyOrigin, CopyStatus } from "@/lib/db/schema";
import { CONDITION_LABELS, ORIGIN_LABELS, STATUS_LABELS, locationLabel } from "../labels";
import type { CopyDraft } from "../copy-draft";
import type { LocationOption } from "../types";

interface CopyFormProps {
  draft: CopyDraft;
  onChange: (patch: Partial<CopyDraft>) => void;
  locations: LocationOption[];
  donors: { id: string; name: string }[];
}

export function CopyForm({ draft, onChange, locations, donors }: CopyFormProps) {
  const donorList = useId();

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ubicación">
          <Select
            value={draft.locationId}
            onChange={(event) => onChange({ locationId: event.target.value })}
          >
            <option value="">Sin ubicación</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {locationLabel(location, location.categoryCode)}
                {location.holds === "extra" ? " · copias" : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Estado">
          <Select
            value={draft.status}
            onChange={(event) => onChange({ status: event.target.value as CopyStatus })}
          >
            {CopyStatus.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Donante">
          <Input
            list={donorList}
            placeholder="Sin donante"
            value={draft.donorName}
            onChange={(event) => onChange({ donorName: event.target.value })}
          />
          <datalist id={donorList}>
            {donors.map((donor) => (
              <option key={donor.id} value={donor.name} />
            ))}
          </datalist>
        </Field>
        <Field label="Tomo">
          <Input
            value={draft.volume}
            onChange={(event) => onChange({ volume: event.target.value })}
          />
        </Field>
      </div>

      <label className="inline-flex min-h-control items-center gap-2">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={draft.labelled}
          onChange={(event) => onChange({ labelled: event.target.checked })}
        />
        Código escrito en el lomo
      </label>

      <details>
        <summary className="inline-flex min-h-control items-center">Más datos del ejemplar</summary>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <Field label="Origen">
            <Select
              value={draft.origin}
              onChange={(event) => onChange({ origin: event.target.value as CopyOrigin })}
            >
              {CopyOrigin.map((origin) => (
                <option key={origin} value={origin}>
                  {ORIGIN_LABELS[origin]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Condición">
            <Select
              value={draft.condition}
              onChange={(event) =>
                onChange({ condition: event.target.value as CopyCondition | "" })
              }
            >
              <option value="">Sin dato</option>
              {CopyCondition.map((condition) => (
                <option key={condition} value={condition}>
                  {CONDITION_LABELS[condition]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Edición">
            <Input
              value={draft.edition}
              onChange={(event) => onChange({ edition: event.target.value })}
            />
          </Field>
          <Field label="Año">
            <Input
              type="number"
              value={draft.year}
              onChange={(event) => onChange({ year: event.target.value })}
            />
          </Field>
          <Field label="Editorial">
            <Input
              value={draft.publisher}
              onChange={(event) => onChange({ publisher: event.target.value })}
            />
          </Field>
          <Field label="País">
            <Input
              value={draft.country}
              onChange={(event) => onChange({ country: event.target.value })}
            />
          </Field>
          <Field label="Piezas">
            <Input
              type="number"
              min={1}
              value={draft.pieces}
              onChange={(event) => onChange({ pieces: event.target.value })}
            />
          </Field>
          <Field label="Notas">
            <Input
              value={draft.notes}
              onChange={(event) => onChange({ notes: event.target.value })}
            />
          </Field>
        </div>
      </details>
    </div>
  );
}
