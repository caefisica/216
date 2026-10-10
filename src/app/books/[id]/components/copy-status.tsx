"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/field";
import { updateCopy } from "@/features/books/actions";
import { STATUS_LABELS } from "@/features/books/labels";
import type { CopyView } from "@/features/books/types";
import { toast, toastActionError } from "@/hooks/use-toast";
import { CopyStatus } from "@/lib/db/schema";
import { isErr } from "@/lib/result";

/** A librarian marks a copy as on the shelf, in maintenance or missing without opening the editor. */
export function CopyStatusSelect({ copy }: { copy: CopyView }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function save(status: CopyStatus) {
    setSaving(true);
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
      status,
      condition: copy.condition,
      labelled: copy.labelled,
      notes: copy.notes,
    });
    setSaving(false);
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    toast({ title: `${copy.code}: ${STATUS_LABELS[status].toLowerCase()}` });
    router.refresh();
  }

  return (
    <Select
      aria-label={`Estado de ${copy.code}`}
      value={copy.status}
      disabled={saving}
      className="w-auto"
      onChange={(event) => save(event.target.value as CopyStatus)}
    >
      {CopyStatus.map((value) => (
        <option key={value} value={value}>
          {STATUS_LABELS[value]}
        </option>
      ))}
    </Select>
  );
}
