import { formatDay } from "@/features/loans/format";
import { ORIGIN_LABELS, STATUS_LABELS, locationLabel } from "@/features/books/labels";
import type { CopyView } from "@/features/books/types";
import { CopyStatusSelect } from "./copy-status";

function stateOf(copy: CopyView) {
  if (copy.loanId) {
    return copy.dueDate ? `Prestado hasta el ${formatDay(copy.dueDate)}` : "Prestado";
  }
  return copy.status === "present" ? "Disponible" : STATUS_LABELS[copy.status];
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
export function CopyList({ copies, staff }: { copies: CopyView[]; staff: boolean }) {
  return (
    <ul className="divide-y border-y">
      {copies.map((copy) => (
        <li key={copy.id} className="grid gap-1 py-3 sm:grid-cols-[7rem_1fr_auto] sm:gap-x-4">
          <span className="font-mono text-xs leading-5 text-muted-foreground">{copy.code}</span>
          <div className="min-w-0">
            <p className="font-medium">{stateOf(copy)}</p>
            <p className="text-muted-foreground">
              {copy.location ? locationLabel(copy.location) : "Sin ubicación"}
            </p>
            <p className="text-xs text-muted-foreground">{editionOf(copy)}</p>
            {staff && copy.donor && (
              <p className="text-xs text-muted-foreground">Donado por {copy.donor.name}</p>
            )}
          </div>
          {staff && <CopyStatusSelect copy={copy} />}
        </li>
      ))}
    </ul>
  );
}
