import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CardList, CardRow } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { BookFilters } from "../schemas";
import { BookRow } from "./book-row";
import type { BookPage } from "../types";

function hrefFor(filters: BookFilters, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, page: page > 1 ? page : undefined })) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `/?${text}` : "/";
}

const isFiltered = (filters: BookFilters) =>
  Boolean(
    filters.search ||
    filters.category ||
    filters.availability ||
    filters.unlabelled ||
    filters.unplaced,
  );

function countLabel(total: number, filters: BookFilters) {
  if (!isFiltered(filters)) return total === 1 ? "1 libro" : `${total} libros`;
  return total === 1 ? "1 resultado" : `${total} resultados`;
}

interface BookListProps {
  result: BookPage;
  filters: BookFilters;
  staff: boolean;
}

export function BookList({ result, filters, staff }: BookListProps) {
  const { items, total, page, pageSize } = result;
  const filtered = isFiltered(filters);

  if (total === 0) {
    return (
      <Empty
        title={filtered ? "Ningún libro coincide" : "El catálogo está vacío"}
        action={
          filtered ? (
            <Link href="/" className={buttonVariants({ variant: "secondary" })}>
              Quitar filtros
            </Link>
          ) : undefined
        }
      >
        {filtered
          ? "Prueba con menos palabras o con solo el apellido del autor. Si no está en el catálogo, pregunta en el ambiente 216."
          : "Aún no se ha registrado ningún libro."}
      </Empty>
    );
  }

  const first = (page - 1) * pageSize + 1;
  const last = first + items.length - 1;
  const pageCount = Math.ceil(total / pageSize);

  return (
    <>
      <div className="mb-2 flex min-h-control items-center justify-between gap-4">
        <p role="status" className="text-sm text-muted-foreground tabular-nums">
          {countLabel(total, filters)}
        </p>
        {filtered && (
          <Link
            href="/"
            className="-mr-2 inline-flex min-h-control items-center rounded-sm px-2 text-sm font-medium text-muted-foreground transition-colors duration-100 hover:text-foreground"
          >
            Quitar filtros
          </Link>
        )}
      </div>

      <CardList>
        {items.map((book, index) => (
          <BookRow key={book.id} book={book} staff={staff} priority={index < 4} />
        ))}
      </CardList>

      {pageCount > 1 && (
        <nav aria-label="Páginas" className="mt-6 flex items-center justify-between gap-4">
          {page > 1 ? (
            <Link
              href={hrefFor(filters, page - 1)}
              className={buttonVariants({ variant: "secondary" })}
              scroll
            >
              <ArrowLeft aria-hidden />
              Anteriores
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground tabular-nums">
            {first}–{last} de {total}
          </span>
          {page < pageCount ? (
            <Link
              href={hrefFor(filters, page + 1)}
              className={buttonVariants({ variant: "secondary" })}
              scroll
            >
              Siguientes
              <ArrowRight aria-hidden />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}

export function BookListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-busy>
      <span className="sr-only">Cargando libros…</span>
      <div className="mb-2 flex min-h-control items-center">
        <Skeleton className="h-4 w-20" />
      </div>
      <CardList aria-hidden>
        {Array.from({ length: rows }, (_, index) => (
          <CardRow
            key={index}
            className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:gap-x-5"
          >
            <Skeleton className="aspect-[2/3] w-full" />
            <div className="grid content-center gap-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3.5 w-1/4" />
            </div>
            <Skeleton className="hidden h-6 w-28 self-center rounded-full sm:block" />
          </CardRow>
        ))}
      </CardList>
    </div>
  );
}
