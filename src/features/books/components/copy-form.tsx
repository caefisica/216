"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyCondition, CopyOrigin, CopyStatus } from "@/lib/db/schema";
import { CONDITION_LABELS, ORIGIN_LABELS, STATUS_LABELS, locationLabel } from "../labels";
import type { CopyDraft } from "../copy-draft";
import type { LocationOption } from "../types";

const selectClass =
  "h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500";

interface CopyFormProps {
  draft: CopyDraft;
  onChange: (patch: Partial<CopyDraft>) => void;
  locations: LocationOption[];
  donors: { id: string; name: string }[];
}

export function CopyForm({ draft, onChange, locations, donors }: CopyFormProps) {
  const donorList = useId();

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div>
        <Label>Origen</Label>
        <select
          className={selectClass}
          value={draft.origin}
          onChange={(e) => onChange({ origin: e.target.value as CopyOrigin })}
        >
          {CopyOrigin.map((origin) => (
            <option key={origin} value={origin}>
              {ORIGIN_LABELS[origin]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Tomo</Label>
        <Input value={draft.volume} onChange={(e) => onChange({ volume: e.target.value })} />
      </div>
      <div>
        <Label>Piezas</Label>
        <Input
          type="number"
          min={1}
          value={draft.pieces}
          onChange={(e) => onChange({ pieces: e.target.value })}
        />
      </div>
      <div>
        <Label>Edición</Label>
        <Input value={draft.edition} onChange={(e) => onChange({ edition: e.target.value })} />
      </div>
      <div>
        <Label>Año</Label>
        <Input
          type="number"
          value={draft.year}
          onChange={(e) => onChange({ year: e.target.value })}
        />
      </div>
      <div>
        <Label>País</Label>
        <Input value={draft.country} onChange={(e) => onChange({ country: e.target.value })} />
      </div>
      <div className="col-span-2">
        <Label>Editorial</Label>
        <Input value={draft.publisher} onChange={(e) => onChange({ publisher: e.target.value })} />
      </div>
      <div className="col-span-2">
        <Label>Ubicación</Label>
        <select
          className={selectClass}
          value={draft.locationId}
          onChange={(e) => onChange({ locationId: e.target.value })}
        >
          <option value="">Sin ubicación</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {locationLabel(location, location.categoryCode)}
              {location.holds === "extra" ? " · copias" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2">
        <Label>Donante</Label>
        <Input
          list={donorList}
          placeholder="Sin donante"
          value={draft.donorName}
          onChange={(e) => onChange({ donorName: e.target.value })}
        />
        <datalist id={donorList}>
          {donors.map((donor) => (
            <option key={donor.id} value={donor.name} />
          ))}
        </datalist>
      </div>
      <div>
        <Label>Estado</Label>
        <select
          className={selectClass}
          value={draft.status}
          onChange={(e) => onChange({ status: e.target.value as CopyStatus })}
        >
          {CopyStatus.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Condición</Label>
        <select
          className={selectClass}
          value={draft.condition}
          onChange={(e) => onChange({ condition: e.target.value as CopyCondition | "" })}
        >
          <option value="">Sin dato</option>
          {CopyCondition.map((condition) => (
            <option key={condition} value={condition}>
              {CONDITION_LABELS[condition]}
            </option>
          ))}
        </select>
      </div>
      <label className="col-span-2 flex items-center gap-2 pt-6 text-sm">
        <input
          type="checkbox"
          checked={draft.labelled}
          onChange={(e) => onChange({ labelled: e.target.checked })}
        />
        Código escrito en el lomo
      </label>
      <div className="col-span-2 md:col-span-4">
        <Label>Notas</Label>
        <Input value={draft.notes} onChange={(e) => onChange({ notes: e.target.value })} />
      </div>
    </div>
  );
}
