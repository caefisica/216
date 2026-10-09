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

const selectClass = "h-8 rounded border border-gray-200 bg-white px-1 text-sm";

interface CopiesTableProps {
  copies: CopyView[];
  canEdit: boolean;
}

export function CopiesTable({ copies, canEdit }: CopiesTableProps) {
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
    return <p className="text-sm text-gray-500">Este libro no tiene ejemplares registrados.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-xs uppercase tracking-wide text-gray-500">
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
              <td className="py-2 pr-3">
                <span className="block text-gray-700">
                  {ORIGIN_LABELS[copy.origin]}
                  {copy.volume ? ` · ${copy.volume}` : ""}
                  {copy.pieces > 1 ? ` · ${copy.pieces} piezas` : ""}
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  {[copy.edition, copy.year, copy.publisher, copy.country]
                    .filter(Boolean)
                    .join(" · ") || "Sin datos de edición"}
                </span>
                <span className="block text-xs text-gray-500">
                  Donante: {copy.donor?.name ?? "—"}
                </span>
              </td>
              <td className="py-2 pr-3">
                {copy.location ? locationLabel(copy.location) : "Sin ubicación"}
              </td>
              <td className="py-2 pr-3">
                {canEdit ? (
                  <select
                    aria-label={`Estado de ${copy.code}`}
                    className={selectClass}
                    value={copy.status}
                    disabled={saving === copy.id}
                    onChange={(e) => save(copy, { status: e.target.value as CopyStatus })}
                  >
                    {CopyStatus.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                ) : copy.loanId ? (
                  <span className="font-medium text-amber-700">Prestado</span>
                ) : copy.status === "present" ? (
                  <span className="font-medium text-emerald-700">Disponible</span>
                ) : (
                  STATUS_LABELS[copy.status]
                )}
                {canEdit && copy.loanId && (
                  <span className="ml-2 text-xs text-orange-600">Prestado</span>
                )}
              </td>
              <td className="py-2">
                {canEdit ? (
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
                    {CopyCondition.map((condition) => (
                      <option key={condition} value={condition}>
                        {CONDITION_LABELS[condition]}
                      </option>
                    ))}
                  </select>
                ) : copy.condition ? (
                  CONDITION_LABELS[copy.condition]
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
