import Link from "next/link";
import { AlertTriangle, Check, Clock } from "lucide-react";
import { daysOverdue, formatDay, overdueLabel } from "@/features/loans/format";
import type { BorrowRequest } from "@/features/users/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** A rejection stays among the current requests for two weeks, so the reader reads the reason. */
export function isCurrent(request: BorrowRequest, now: Date) {
  if (request.status === "pending" || request.status === "approved") return true;
  return request.status === "rejected" && now.getTime() - request.updatedAt.getTime() < 14 * DAY_MS;
}

function Status({ request, now }: { request: BorrowRequest; now: Date }) {
  if (request.status === "pending") {
    return (
      <p className="flex items-center gap-1.5 text-warning">
        <Clock aria-hidden className="size-4" />
        Esperando respuesta de la biblioteca
      </p>
    );
  }
  if (request.status === "approved") {
    const late = daysOverdue(request.dueDate, now);
    if (late !== null) {
      return (
        <p className="flex items-center gap-1.5 font-medium text-destructive">
          <AlertTriangle aria-hidden className="size-4" />
          {overdueLabel(late)}. Devuélvelo en el ambiente 216.
        </p>
      );
    }
    return (
      <p className="flex items-center gap-1.5 text-success">
        <Check aria-hidden className="size-4" />
        {request.dueDate ? `Devuélvelo antes del ${formatDay(request.dueDate)}` : "Aprobado"}
      </p>
    );
  }
  if (request.status === "rejected") {
    return (
      <p className="text-destructive">
        No aprobado{request.rejectionReason ? `: ${request.rejectionReason}` : ""}
      </p>
    );
  }
  return (
    <p className="text-muted-foreground">
      Devuelto{request.returnDate ? ` el ${formatDay(request.returnDate)}` : ""}
    </p>
  );
}

export function LoanRow({ request, now }: { request: BorrowRequest; now: Date }) {
  const book = request.book;
  return (
    <li className="py-3">
      {book ? (
        <Link
          href={`/books/${book.id}`}
          className="inline-flex items-center font-serif text-lg font-semibold leading-snug underline-offset-2 hover:underline pointer-coarse:min-h-control"
        >
          {book.title}
        </Link>
      ) : (
        <p className="font-serif text-lg font-semibold">Libro retirado del catálogo</p>
      )}
      {book?.author && <p className="text-muted-foreground">{book.author}</p>}
      <div className="mt-1">
        <Status request={request} now={now} />
      </div>
    </li>
  );
}
