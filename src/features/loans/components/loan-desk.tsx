import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CardRow } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Kbd } from "@/components/ui/kbd";
import { PageTitle } from "@/components/ui/page";
import { SegmentedNav } from "@/components/ui/segmented";
import { daysOverdue, formatDay, overdueCountLabel, overdueLabel } from "../format";
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

function Views({ desk }: { desk: Desk }) {
  const { counts } = desk;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <SegmentedNav
        label="Listas"
        items={[
          {
            href: deskHref("requests", 1, desk.query),
            current: desk.view === "requests",
            label: (
              <>
                Solicitudes <span className="tabular-nums">{counts.pending}</span>
              </>
            ),
          },
          {
            href: deskHref("loans", 1, desk.query),
            current: desk.view === "loans",
            label: (
              <>
                Prestados <span className="tabular-nums">{counts.active}</span>
              </>
            ),
          },
        ]}
      />
      {counts.overdue > 0 && (
        <Badge tone="destructive">
          <AlertTriangle aria-hidden />
          {overdueCountLabel(counts.overdue)}
        </Badge>
      )}
    </div>
  );
}

function Title({ book }: { book: { id: string; title: string } }) {
  return (
    <p className="text-pretty">
      <Link
        href={`/books/${book.id}`}
        className="inline-flex items-center rounded-xs font-serif text-lg font-medium underline-offset-2 hover:underline pointer-coarse:min-h-control"
      >
        {book.title}
      </Link>
    </p>
  );
}

const rowLayout = "grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6";

function RequestRow({ request }: { request: PendingRequestRow }) {
  return (
    <CardRow className={rowLayout}>
      <div className="min-w-0">
        <Title book={request.book} />
        <p className="text-muted-foreground">
          {request.reader.name} · pidió el {formatDay(request.requestDate)}
        </p>
        {request.note && <p className="mt-1.5 text-muted-foreground">“{request.note}”</p>}
      </div>
      <RequestActions
        requestId={request.id}
        title={request.book.title}
        reader={request.reader.name}
        copies={request.lendableCopies}
      />
    </CardRow>
  );
}

function LoanRow({ loan, now }: { loan: ActiveLoanRow; now: Date }) {
  const late = daysOverdue(loan.dueDate, now);
  return (
    <CardRow className={`${rowLayout} sm:items-center`}>
      <div className="min-w-0">
        <Title book={loan.book} />
        <p className="text-muted-foreground">
          {loan.reader.name} · <span className="font-mono text-xs">{loan.copy.code}</span>
          {loan.copy.volume ? ` · vol. ${loan.copy.volume}` : ""}
        </p>
        {late !== null ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Badge tone="destructive">
              <AlertTriangle aria-hidden />
              {overdueLabel(late)}
            </Badge>
            <a
              href={`mailto:${loan.reader.email}`}
              className="inline-flex items-center rounded-xs text-sm text-accent underline underline-offset-2 pointer-coarse:min-h-control"
            >
              {loan.reader.email}
            </a>
          </div>
        ) : (
          loan.dueDate && (
            <p className="text-muted-foreground">Vence el {formatDay(loan.dueDate)}</p>
          )
        )}
      </div>
      <ReturnButton requestId={loan.id} title={loan.book.title} reader={loan.reader.name} />
    </CardRow>
  );
}

function Pager({ desk }: { desk: Desk }) {
  if (desk.pageCount === 1) return null;
  const first = (desk.page - 1) * desk.pageSize + 1;
  const last = Math.min(desk.page * desk.pageSize, desk.total);
  return (
    <nav aria-label="Páginas" className="mt-6 flex items-center justify-between gap-4">
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
      <span className="text-sm text-muted-foreground tabular-nums">
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
      <PageTitle>Préstamos</PageTitle>
      <Views desk={desk} />
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
              <p className="mt-3 hidden items-center gap-2 text-sm text-muted-foreground pointer-fine:flex">
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
