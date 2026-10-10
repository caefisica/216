import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { Kbd } from "@/components/ui/kbd";
import { daysOverdue, formatDay, overdueLabel } from "../format";
import type { DeskView } from "../schemas";
import type { ActiveLoanRow, Desk, PendingRequestRow } from "../types";
import { DeskList } from "./desk-list";
import { DeskSearch } from "./desk-search";
import { RequestActions } from "./request-actions";
import { ReturnButton } from "./return-button";

const deskHref = (view: DeskView, page = 1, query = "") =>
  `/admin/loans?${new URLSearchParams({
    view,
    ...(query && { q: query }),
    ...(page > 1 && { page: String(page) }),
  })}`;

const tab =
  "inline-flex h-control items-center gap-2 px-1 font-medium whitespace-nowrap text-muted-foreground hover:text-foreground aria-[current=page]:text-foreground aria-[current=page]:underline aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8";

function Tabs({ desk }: { desk: Desk }) {
  const { counts } = desk;
  return (
    <nav aria-label="Listas" className="flex flex-wrap items-center gap-x-6">
      <Link
        href={deskHref("requests", 1, desk.query)}
        aria-current={desk.view === "requests" ? "page" : undefined}
        className={tab}
      >
        Solicitudes <span className="tabular-nums">{counts.pending}</span>
      </Link>
      <Link
        href={deskHref("loans", 1, desk.query)}
        aria-current={desk.view === "loans" ? "page" : undefined}
        className={tab}
      >
        Prestados <span className="tabular-nums">{counts.active}</span>
      </Link>
      {counts.overdue > 0 && (
        <span className="inline-flex items-center gap-1 text-destructive">
          <AlertTriangle aria-hidden className="size-4" />
          {counts.overdue === 1 ? "1 vencido" : `${counts.overdue} vencidos`}
        </span>
      )}
    </nav>
  );
}

function Title({ book }: { book: { id: string; code: string; title: string } }) {
  return (
    <p>
      <Link
        href={`/books/${book.id}`}
        className="inline-flex items-center font-medium underline-offset-2 hover:underline pointer-coarse:min-h-control"
      >
        {book.title}
      </Link>
      <span className="ml-2 font-mono text-xs text-muted-foreground">{book.code}</span>
    </p>
  );
}

function RequestRow({ request }: { request: PendingRequestRow }) {
  return (
    <li className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:gap-6">
      <div className="min-w-0">
        <Title book={request.book} />
        <p className="text-muted-foreground">
          {request.reader.name} · pidió el {formatDay(request.requestDate)}
        </p>
        {request.note && <p className="mt-1 text-muted-foreground">“{request.note}”</p>}
      </div>
      <RequestActions
        requestId={request.id}
        title={request.book.title}
        reader={request.reader.name}
        copies={request.lendableCopies}
      />
    </li>
  );
}

function LoanRow({ loan, now }: { loan: ActiveLoanRow; now: Date }) {
  const late = daysOverdue(loan.dueDate, now);
  return (
    <li className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
      <div className="min-w-0">
        <Title book={loan.book} />
        <p className="text-muted-foreground">
          {loan.reader.name} · <span className="font-mono text-xs">{loan.copy.code}</span>
          {loan.copy.volume ? ` · vol. ${loan.copy.volume}` : ""}
        </p>
        {late !== null ? (
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-destructive">
            <AlertTriangle aria-hidden className="size-4" />
            <span className="font-medium">{overdueLabel(late)}</span>
            <a href={`mailto:${loan.reader.email}`} className="underline underline-offset-2">
              {loan.reader.email}
            </a>
          </p>
        ) : (
          loan.dueDate && (
            <p className="text-muted-foreground">Vence el {formatDay(loan.dueDate)}</p>
          )
        )}
      </div>
      <ReturnButton requestId={loan.id} title={loan.book.title} reader={loan.reader.name} />
    </li>
  );
}

function Pager({ desk }: { desk: Desk }) {
  if (desk.pageCount === 1) return null;
  const first = (desk.page - 1) * desk.pageSize + 1;
  const last = Math.min(desk.page * desk.pageSize, desk.total);
  return (
    <nav aria-label="Páginas" className="mt-4 flex items-center justify-between gap-4">
      {desk.page > 1 ? (
        <Link
          href={deskHref(desk.view, desk.page - 1, desk.query)}
          className={buttonVariants({ variant: "secondary" })}
        >
          <ArrowLeft aria-hidden />
          Anteriores
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted-foreground">
        {first}–{last} de {desk.total}
      </span>
      {desk.page < desk.pageCount ? (
        <Link
          href={deskHref(desk.view, desk.page + 1, desk.query)}
          className={buttonVariants({ variant: "secondary" })}
        >
          Siguientes
          <ArrowRight aria-hidden />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

function Nothing({ desk }: { desk: Desk }) {
  if (desk.query) {
    return (
      <Empty
        title="Nada coincide"
        action={
          <Link href={deskHref(desk.view)} className={buttonVariants({ variant: "secondary" })}>
            Quitar búsqueda
          </Link>
        }
      >
        {desk.view === "requests"
          ? "Ninguna solicitud pendiente tiene ese lector o título."
          : "Ningún préstamo vigente tiene ese lector, título o código."}
      </Empty>
    );
  }
  if (desk.view === "requests") {
    return (
      <Empty
        title="No hay solicitudes"
        action={
          desk.counts.active > 0 ? (
            <Link href={deskHref("loans")} className={buttonVariants({ variant: "secondary" })}>
              Ver prestados
            </Link>
          ) : undefined
        }
      >
        Cuando un lector pida un libro aparecerá aquí.
      </Empty>
    );
  }
  return <Empty title="No hay libros prestados">Los préstamos aprobados aparecen aquí.</Empty>;
}

export function LoanDesk({ desk }: { desk: Desk }) {
  const label = desk.view === "requests" ? "Solicitudes pendientes" : "Préstamos vigentes";
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Préstamos</h1>
      <Tabs desk={desk} />
      <DeskSearch view={desk.view} query={desk.query}>
        {desk.items.length === 0 ? (
          <Nothing desk={desk} />
        ) : (
          <>
            <DeskList label={label}>
              {desk.view === "requests"
                ? desk.items.map((request) => <RequestRow key={request.id} request={request} />)
                : desk.items.map((loan) => <LoanRow key={loan.id} loan={loan} now={desk.now} />)}
            </DeskList>
            {desk.query && desk.items.length === 1 && (
              <p className="mt-3 hidden items-center gap-2 text-muted-foreground pointer-fine:flex">
                <Kbd>Enter</Kbd>
                {desk.view === "requests" ? "aprueba" : "registra la devolución de"} este resultado
              </p>
            )}
            <Pager desk={desk} />
          </>
        )}
      </DeskSearch>
    </div>
  );
}
