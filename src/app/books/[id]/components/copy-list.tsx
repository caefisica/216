import { CardList, CardRow } from "@/components/ui/card";
import { dueSuffix } from "@/features/loans/format";
import { ORIGIN_LABELS, STATUS_LABELS, locationLabel } from "@/features/books/labels";
import type { CopyView } from "@/features/books/types";
import { cn } from "@/lib/utils";
import { CopyStatusSelect } from "./copy-status";

function stateOf(copy: CopyView, now: Date) {
  if (copy.loanId) {
    const text = copy.dueDate ? `Prestado${dueSuffix(copy.dueDate, now)}` : "Prestado";
    return { text, tone: "bg-warning" };
  }
  return copy.status === "present"
    ? { text: "Disponible", tone: "bg-success" }
    : { text: STATUS_LABELS[copy.status], tone: "bg-muted-foreground" };
}

const editionOf = (copy: CopyView) =>
  [
    ORIGIN_LABELS[copy.origin],
    copy.volume,
    copy.pieces > 1 ? `${copy.pieces} piezas` : null,
    copy.edition,
    copy.year,
    copy.publisher,
    copy.country,
  ]
    .filter(Boolean)
    .join(" · ");

/** One row per physical copy. Staff can change a copy's state here; the rest is read only. */
export function CopyList({
  copies,
  staff,
  now,
}: {
  copies: CopyView[];
  staff: boolean;
  now: Date;
}) {
  return (
    <CardList>
      {copies.map((copy) => {
        const state = stateOf(copy, now);
        return (
          <CardRow
            key={copy.id}
            className="grid gap-1 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] sm:items-start sm:gap-x-5"
          >
            <span className="font-mono text-xs leading-6 text-muted-foreground">{copy.code}</span>
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-medium">
                <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", state.tone)} />
                {state.text}
              </p>
              <p className="text-sm text-muted-foreground">
                {copy.location ? locationLabel(copy.location) : "Sin ubicación"}
              </p>
              {editionOf(copy) && (
                <p className="text-sm text-muted-foreground">{editionOf(copy)}</p>
              )}
              {staff && copy.donor && (
                <p className="text-sm text-muted-foreground">Donado por {copy.donor.name}</p>
              )}
            </div>
            {staff && (
              <div className="mt-2 sm:mt-0">
                <CopyStatusSelect copy={copy} />
              </div>
            )}
          </CardRow>
        );
      })}
    </CardList>
  );
}
