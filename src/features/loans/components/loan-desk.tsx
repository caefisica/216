import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DESK_LIST_ID } from "../constants";
import { daysOverdue, formatDay, overdueCountLabel, overdueLabel } from "../format";
import type { Desk, LoanCounts } from "../types";
import type { DeskView } from "../schemas";
import { RequestActions } from "./request-actions";
import { ReturnButton } from "./return-button";

const deskHref = (view: DeskView, page = 1) =>
  `/admin/loans?${new URLSearchParams({ view, ...(page > 1 && { page: String(page) }) })}`;

function ViewLinks({ view, counts }: { view: DeskView; counts: LoanCounts }) {
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
          href={deskHref(link.view)}
          aria-current={link.view === view ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-md border px-4 text-sm font-semibold focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            link.view === view
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-500 bg-white text-gray-900 hover:bg-gray-100",
          )}
        >
          {link.label}
          <span className="tabular-nums">{link.count}</span>
          {link.note && (
            <span
              className={cn(
                "rounded-sm px-1.5 py-0.5 text-xs font-bold",
                link.view === view ? "bg-red-100 text-red-900" : "bg-red-50 text-red-800",
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
      <p className="text-sm tabular-nums text-gray-800">
        {first}–{last} de {desk.total}
      </p>
      <div className="flex gap-2">
        {desk.page > 1 ? (
          <Link
            href={deskHref(desk.view, desk.page - 1)}
            className={cn(step, "border-gray-500 bg-white text-gray-900 hover:bg-gray-100")}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden /> Anterior
          </Link>
        ) : (
          <span aria-disabled="true" className={cn(step, "border-gray-300 text-gray-700")}>
            <ChevronLeft className="h-4 w-4" aria-hidden /> Anterior
          </span>
        )}
        {desk.page < desk.pageCount ? (
          <Link
            href={deskHref(desk.view, desk.page + 1)}
            className={cn(step, "border-gray-500 bg-white text-gray-900 hover:bg-gray-100")}
          >
            Siguiente <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : (
          <span aria-disabled="true" className={cn(step, "border-gray-300 text-gray-700")}>
            Siguiente <ChevronRight className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}

const head =
  "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-700 max-md:sr-only";
const cell = "block px-3 py-2 md:table-cell md:align-top";
const label = "mr-2 text-xs font-semibold uppercase tracking-wide text-gray-700 md:hidden";
const row = "block border-b border-gray-300 py-2 md:table-row md:py-0";

function Title({
  book,
}: {
  book: { id: string; code: string; title: string; author: string | null };
}) {
  return (
    <>
      <Link
        href={`/books/${book.id}`}
        className="font-semibold text-gray-950 underline-offset-2 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      >
        {book.title}
      </Link>
      <span className="ml-2 font-mono text-xs text-gray-700">{book.code}</span>
      {book.author && <p className="text-sm text-gray-700">{book.author}</p>}
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
          <th scope="col" className={head}>
            Título
          </th>
          <th scope="col" className={head}>
            Lector
          </th>
          <th scope="col" className={head}>
            Solicitado
          </th>
          <th scope="col" className={head}>
            Decisión
          </th>
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
              <span className="font-medium text-gray-900">{request.reader.name}</span>
              <p className="break-all text-sm text-gray-700">{request.reader.email}</p>
              {request.note && <p className="text-sm italic text-gray-800">“{request.note}”</p>}
            </td>
            <td className={cell}>
              <span className={label}>Solicitado</span>
              <time dateTime={request.requestDate.toISOString()} className="text-sm text-gray-900">
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
          <th scope="col" className={head}>
            Título
          </th>
          <th scope="col" className={head}>
            Lector
          </th>
          <th scope="col" className={head}>
            Vence
          </th>
          <th scope="col" className={head}>
            Devolución
          </th>
        </tr>
      </thead>
      <tbody className="block md:table-row-group">
        {desk.items.map((loan) => {
          const late = daysOverdue(loan.dueDate, desk.now);
          return (
            <tr key={loan.id} className={row}>
              <td className={cell}>
                <Title book={loan.book} />
                <p className="font-mono text-xs text-gray-700">
                  {loan.copy.code}
                  {loan.copy.volume ? ` · vol. ${loan.copy.volume}` : ""}
                </p>
              </td>
              <td className={cell}>
                <span className={label}>Lector</span>
                <span className="font-medium text-gray-900">{loan.reader.name}</span>
                <p className="break-all text-sm text-gray-700">{loan.reader.email}</p>
              </td>
              <td className={cell}>
                <span className={label}>Vence</span>
                {loan.dueDate && (
                  <time dateTime={loan.dueDate.toISOString()} className="text-sm text-gray-900">
                    {formatDay(loan.dueDate)}
                  </time>
                )}
                {late !== null && (
                  <p className="mt-1 inline-block rounded-sm bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-900 md:block md:w-fit">
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-gray-300 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-950">Mostrador de préstamos</h1>
        <ViewLinks view={desk.view} counts={desk.counts} />
      </div>

      <section
        id={DESK_LIST_ID}
        tabIndex={-1}
        aria-label={desk.view === "requests" ? "Solicitudes pendientes" : "Préstamos vigentes"}
        className="rounded-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      >
        {desk.items.length === 0 ? (
          <p className="py-12 text-center text-gray-800">{empty}</p>
        ) : desk.view === "requests" ? (
          <RequestsTable desk={desk} />
        ) : (
          <LoansTable desk={desk} />
        )}
      </section>

      <Pager desk={desk} />

      {desk.view === "requests" && desk.items.length > 0 && (
        <p className="text-sm text-gray-700">
          Cada solicitud trae elegido el ejemplar de número más bajo. Pulsa Enter sobre el ejemplar
          para aprobarla.
        </p>
      )}
    </div>
  );
}
