import Link from "next/link";
import { AlertTriangle, Check, Clock, X } from "lucide-react";
import { BookCover } from "@/components/catalogue/book-cover";
import { Badge } from "@/components/ui/badge";
import { CardRow, rowLink } from "@/components/ui/card";
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
      <Badge tone="warning">
        <Clock aria-hidden />
        Esperando respuesta
      </Badge>
    );
  }
  if (request.status === "approved") {
    const late = daysOverdue(request.dueDate, now);
    if (late !== null) {
      return (
        <>
          <Badge tone="destructive">
            <AlertTriangle aria-hidden />
            {overdueLabel(late)}
          </Badge>
          <p className="text-sm text-muted-foreground">Devuélvelo en el ambiente 216.</p>
        </>
      );
    }
    return (
      <>
        <Badge tone="success">
          <Check aria-hidden />
          Aprobado
        </Badge>
        {request.dueDate && (
          <p className="text-sm text-muted-foreground">
            Devuélvelo antes del {formatDay(request.dueDate)}
          </p>
        )}
      </>
    );
  }
  if (request.status === "rejected") {
    return (
      <>
        <Badge tone="destructive">
          <X aria-hidden />
          No aprobado
        </Badge>
        {request.rejectionReason && (
          <p className="text-sm text-muted-foreground">{request.rejectionReason}</p>
        )}
      </>
    );
  }
  return (
    <p className="text-sm text-muted-foreground">
      Devuelto{request.returnDate ? ` el ${formatDay(request.returnDate)}` : ""}
    </p>
  );
}

export function LoanRow({ request, now }: { request: BorrowRequest; now: Date }) {
  const book = request.book;
  return (
    <CardRow
      className={
        book
          ? "grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-x-5"
          : undefined
      }
    >
      {book && (
        <BookCover
          title={book.title}
          author={book.author}
          category={book.category.name}
          imageUrl={book.imageUrl}
          compact
          className="self-start"
        />
      )}
      <div className="min-w-0 self-center">
        <h3 className="font-serif text-lg font-medium text-pretty">
          {book ? (
            <Link href={`/books/${book.id}`} {...rowLink}>
              {book.title}
            </Link>
          ) : (
            "Libro retirado del catálogo"
          )}
        </h3>
        {book?.author && <p className="mt-0.5 text-muted-foreground">{book.author}</p>}
        <div className="mt-2 grid justify-items-start gap-1.5">
          <Status request={request} now={now} />
        </div>
      </div>
    </CardRow>
  );
}
