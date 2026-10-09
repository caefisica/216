import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { DESK_LIST_ID } from "../constants";
import { daysOverdue, formatDay, overdueCountLabel, overdueLabel } from "../format";
import type { Desk, LoanCounts } from "../types";
import type { DeskView } from "../schemas";
import { RequestActions } from "./request-actions";
import { ReturnButton } from "./return-button";

const deskHref = (view: DeskView, page = 1, query = "") =>
  `/admin/loans?${new URLSearchParams({
    view,
    ...(query && { q: query }),
    ...(page > 1 && { page: String(page) }),
  })}`;

function ViewLinks({ view, counts, query }: { view: DeskView; counts: LoanCounts; query: string }) {
  const links = [
    { view: "requests", label: "Solicitudes", count: counts.pending, note: null },
    {
      view: "loans",
      label: "Préstamos vigentes",
      count: counts.active,
      note: counts.overdue > 0 ? overdueCountLabel(counts.overdue) : null,
    },
  ] as const;
  return (
    <nav aria-label="Vistas del mostrador" className="flex flex-wrap gap-2">
      {links.map((link) => (
        <Link
          key={link.view}
          href={deskHref(link.view, 1, query)}
          aria-current={link.view === view ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-md border px-4 text-sm font-semibold focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            link.view === view
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-surface text-foreground hover:bg-accent",
          )}
        >
          {link.label}
          <span className="tabular-nums">{link.count}</span>
          {link.note && (
            <span
              className={cn(
                "rounded-sm px-1.5 py-0.5 text-xs font-bold",
                link.view === view
                  ? "bg-destructive/20 text-destructive-foreground"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {link.note}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}

function Pager({ desk }: { desk: Desk }) {
  if (desk.pageCount === 1) return null;
  const first = (desk.page - 1) * desk.pageSize + 1;
  const last = Math.min(desk.page * desk.pageSize, desk.total);
  const step = "inline-flex min-h-11 items-center gap-1 rounded-md border px-3 text-sm font-medium";
  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-3">
      <p className="text-sm tabular-nums text-muted-foreground">
        {first}–{last} de {desk.total}
      </p>
      <div className="flex gap-2">
        {desk.page > 1 ? (
          <Link
            href={deskHref(desk.view, desk.page - 1, desk.query)}
            className={cn(step, "border-border bg-surface text-foreground hover:bg-accent")}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden /> Anterior
          </Link>
        ) : (
          <span aria-disabled="true" className={cn(step, "border-border text-muted-foreground")}>
            <ChevronLeft className="h-4 w-4" aria-hidden /> Anterior
          </span>
        )}
        {desk.page < desk.pageCount ? (
          <Link
            href={deskHref(desk.view, desk.page + 1, desk.query)}
            className={cn(step, "border-border bg-surface text-foreground hover:bg-accent")}
          >
            Siguiente <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : (
          <span aria-disabled="true" className={cn(step, "border-border text-muted-foreground")}>
            Siguiente <ChevronRight className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}

const head =
  "px-3 py-2 text-left text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground max-md:sr-only";
const cell = "block px-3 py-3 md:table-cell md:align-top";
const label =
  "mr-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground md:hidden";
const row = "block border-b border-border py-2 last:border-b-0 md:table-row md:py-0";

function Title({
  book,
}: {
  book: { id: string; code: string; title: string; author: string | null };
}) {
  return (
    <>
      <Link
        href={`/books/${book.id}`}
        className="font-semibold text-foreground underline-offset-2 hover:text-primary hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      >
        {book.title}
      </Link>
      <span className="ml-2 font-mono text-xs text-muted-foreground">{book.code}</span>
      {book.author && <p className="text-sm text-muted-foreground">{book.author}</p>}
    </>
  );
}

function RequestsTable({ desk }: { desk: Extract<Desk, { view: "requests" }> }) {
  return (
    <table className="block w-full md:table">
      <caption className="sr-only">
        Solicitudes pendientes, las más antiguas primero. Cada fila tiene un ejemplar preelegido.
      </caption>
      <thead className="block md:table-header-group">
        <tr className="block md:table-row">
          {(["Título", "Lector", "Solicitado", "Decisión"] as const).map((heading) => (
            <th key={heading} scope="col" className={head}>
              {heading}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="block md:table-row-group">
        {desk.items.map((request) => (
          <tr key={request.id} className={row}>
            <td className={cell}>
              <Title book={request.book} />
            </td>
            <td className={cell}>
              <span className={label}>Lector</span>
              <span className="font-medium text-foreground">{request.reader.name}</span>
              <p className="break-all text-sm text-muted-foreground">{request.reader.email}</p>
              {request.note && (
                <p className="text-sm italic text-muted-foreground">“{request.note}”</p>
              )}
            </td>
            <td className={cell}>
              <span className={label}>Solicitado</span>
              <time
                dateTime={request.requestDate.toISOString()}
                className="text-sm text-foreground"
              >
                {formatDay(request.requestDate)}
              </time>
            </td>
            <td className={cn(cell, "md:w-[26rem]")}>
              <RequestActions
                requestId={request.id}
                title={request.book.title}
                reader={request.reader.name}
                copies={request.lendableCopies}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LoansTable({ desk }: { desk: Extract<Desk, { view: "loans" }> }) {
  return (
    <table className="block w-full md:table">
      <caption className="sr-only">
        Préstamos vigentes. Los vencidos aparecen primero, luego por fecha de vencimiento.
      </caption>
      <thead className="block md:table-header-group">
        <tr className="block md:table-row">
          {(["Título", "Lector", "Vence", "Devolución"] as const).map((heading) => (
            <th key={heading} scope="col" className={head}>
              {heading}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="block md:table-row-group">
        {desk.items.map((loan) => {
          const late = daysOverdue(loan.dueDate, desk.now);
          return (
            <tr key={loan.id} className={cn(row, late !== null && "bg-destructive/5")}>
              <td className={cell}>
                <Title book={loan.book} />
                <p className="font-mono text-xs text-muted-foreground">
                  {loan.copy.code}
                  {loan.copy.volume ? ` · vol. ${loan.copy.volume}` : ""}
                </p>
              </td>
              <td className={cell}>
                <span className={label}>Lector</span>
                <span className="font-medium text-foreground">{loan.reader.name}</span>
                <p className="break-all text-sm text-muted-foreground">{loan.reader.email}</p>
              </td>
              <td className={cell}>
                <span className={label}>Vence</span>
                {loan.dueDate && (
                  <time dateTime={loan.dueDate.toISOString()} className="text-sm text-foreground">
                    {formatDay(loan.dueDate)}
                  </time>
                )}
                {late !== null && (
                  <p className="mt-1 inline-block rounded-sm bg-destructive/10 px-1.5 py-0.5 text-xs font-bold text-destructive md:block md:w-fit">
                    {overdueLabel(late)}
                  </p>
                )}
              </td>
              <td className={cn(cell, "md:w-48")}>
                <ReturnButton
                  requestId={loan.id}
                  title={loan.book.title}
                  reader={loan.reader.name}
                  copyCode={loan.copy.code}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function LoanDesk({ desk }: { desk: Desk }) {
  const empty =
    desk.view === "requests" ? "No hay solicitudes pendientes." : "No hay libros prestados.";
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Administración</p>
          <h1 className="mt-2 text-[1.875rem] font-semibold tracking-tight text-foreground">
            Mostrador de préstamos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Devuelve libros y atiende solicitudes desde un solo lugar.
          </p>
        </div>
        <ViewLinks view={desk.view} counts={desk.counts} query={desk.query} />
      </div>

      <form
        method="get"
        action="/admin/loans"
        className="surface flex flex-col gap-3 p-3 sm:flex-row sm:items-center"
      >
        <input type="hidden" name="view" value={desk.view} />
        <label htmlFor="loan-search" className="sr-only">
          Buscar por lector o título
        </label>
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            id="loan-search"
            name="q"
            defaultValue={desk.query}
            placeholder="Buscar por lector o título"
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/25"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Buscar
        </button>
        {desk.query && (
          <Link
            href={deskHref(desk.view)}
            className="text-center text-sm font-medium text-primary hover:underline"
          >
            Limpiar
          </Link>
        )}
      </form>

      <section
        id={DESK_LIST_ID}
        tabIndex={-1}
        aria-label={desk.view === "requests" ? "Solicitudes pendientes" : "Préstamos vigentes"}
        className="surface overflow-hidden focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      >
        {desk.items.length === 0 ? (
          <p className="px-4 py-16 text-center text-sm text-muted-foreground">
            {desk.query ? "No encontramos coincidencias." : empty}
          </p>
        ) : desk.view === "requests" ? (
          <RequestsTable desk={desk} />
        ) : (
          <LoansTable desk={desk} />
        )}
      </section>

      <Pager desk={desk} />

      {desk.view === "requests" && desk.items.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Cada solicitud trae elegido el ejemplar de número más bajo. Pulsa Enter sobre el ejemplar
          para aprobarla.
        </p>
      )}
    </div>
  );
}
