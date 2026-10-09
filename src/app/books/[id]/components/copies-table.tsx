"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CONDITION_LABELS,
  ORIGIN_LABELS,
  STATUS_LABELS,
  locationLabel,
} from "@/features/books/labels";
import { updateCopy } from "@/features/books/actions";
import { CopyCondition, CopyStatus } from "@/lib/db/schema";
import { toast, toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import type { CopyView } from "@/features/books/types";

const selectClass = "h-8 max-w-full rounded border border-border bg-surface px-1 text-sm";

interface CopiesTableProps {
  copies: CopyView[];
  canEdit: boolean;
  layout?: "table" | "stacked";
}

export function CopiesTable({ copies, canEdit, layout = "table" }: CopiesTableProps) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);

  const save = async (copy: CopyView, patch: Partial<Pick<CopyView, "status" | "condition">>) => {
    setSaving(copy.id);
    const result = await updateCopy({
      copyId: copy.id,
      origin: copy.origin,
      volume: copy.volume,
      pieces: copy.pieces,
      edition: copy.edition,
      year: copy.year,
      country: copy.country,
      publisher: copy.publisher,
      locationId: copy.locationId,
      donorId: copy.donorId,
      status: patch.status ?? copy.status,
      condition: patch.condition === undefined ? copy.condition : patch.condition,
      labelled: copy.labelled,
      notes: copy.notes,
    });
    setSaving(null);
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    toast({ title: `Ejemplar ${copy.code} actualizado` });
    router.refresh();
  };

  if (copies.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Este libro no tiene ejemplares registrados.</p>
    );
  }

  const edition = (copy: CopyView) => (
    <>
      <span className="block">
        {ORIGIN_LABELS[copy.origin]}
        {copy.volume ? ` · ${copy.volume}` : ""}
        {copy.pieces > 1 ? ` · ${copy.pieces} piezas` : ""}
      </span>
      <span className="mt-0.5 block text-xs text-muted-foreground">
        {[copy.edition, copy.year, copy.publisher, copy.country].filter(Boolean).join(" · ") ||
          "Sin datos de edición"}
      </span>
      <span className="block text-xs text-muted-foreground">
        Donante: {copy.donor?.name ?? "—"}
      </span>
    </>
  );

  const location = (copy: CopyView) =>
    copy.location ? locationLabel(copy.location) : "Sin ubicación";

  const status = (copy: CopyView) => (
    <>
      {canEdit ? (
        <select
          aria-label={`Estado de ${copy.code}`}
          className={selectClass}
          value={copy.status}
          disabled={saving === copy.id}
          onChange={(e) => save(copy, { status: e.target.value as CopyStatus })}
        >
          {CopyStatus.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      ) : copy.loanId ? (
        <span className="font-medium text-muted-foreground">Prestado</span>
      ) : copy.status === "present" ? (
        <span className="font-medium text-status-available">Disponible</span>
      ) : (
        STATUS_LABELS[copy.status]
      )}
      {canEdit && copy.loanId && (
        <span className="ml-2 text-xs text-muted-foreground">Prestado</span>
      )}
    </>
  );

  const condition = (copy: CopyView) =>
    canEdit ? (
      <select
        aria-label={`Condición de ${copy.code}`}
        className={selectClass}
        value={copy.condition ?? ""}
        disabled={saving === copy.id}
        onChange={(e) =>
          save(copy, { condition: (e.target.value || null) as CopyCondition | null })
        }
      >
        <option value="">Sin dato</option>
        {CopyCondition.map((value) => (
          <option key={value} value={value}>
            {CONDITION_LABELS[value]}
          </option>
        ))}
      </select>
    ) : copy.condition ? (
      CONDITION_LABELS[copy.condition]
    ) : (
      "—"
    );

  if (layout === "stacked") {
    return (
      <ul aria-label="Ejemplares" className="divide-y border-t border-border text-sm">
        {copies.map((copy) => (
          <li key={copy.id} className="py-3">
            <p className="font-mono text-xs font-medium">{copy.code}</p>
            <dl className="mt-2 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5">
              <dt className="text-xs text-muted-foreground">Disponibilidad</dt>
              <dd>{status(copy)}</dd>
              <dt className="text-xs text-muted-foreground">Ejemplar</dt>
              <dd className="break-words">{edition(copy)}</dd>
              <dt className="text-xs text-muted-foreground">Ubicación</dt>
              <dd>{location(copy)}</dd>
              <dt className="text-xs text-muted-foreground">Condición</dt>
              <dd>{condition(copy)}</dd>
            </dl>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full min-w-[46rem] table-fixed text-left text-sm">
        <colgroup>
          <col className="w-[6.5rem]" />
          <col />
          <col className="w-[9rem]" />
          <col className="w-[10rem]" />
          <col className="w-[8rem]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide whitespace-nowrap text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Código</th>
            <th className="py-2 pr-3 font-medium">Ejemplar e imprint</th>
            <th className="py-2 pr-3 font-medium">Ubicación</th>
            <th className="py-2 pr-3 font-medium">Disponibilidad</th>
            <th className="py-2 font-medium">Condición</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {copies.map((copy) => (
            <tr key={copy.id} className="align-top">
              <td className="py-2 pr-3 font-mono text-xs">{copy.code}</td>
              <td className="break-words py-2 pr-3">{edition(copy)}</td>
              <td className="py-2 pr-3">{location(copy)}</td>
              <td className="py-2 pr-3">{status(copy)}</td>
              <td className="py-2">{condition(copy)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
