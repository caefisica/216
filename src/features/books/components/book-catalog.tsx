"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Pencil, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBooks, setHeart } from "../actions";
import { availabilityLabel } from "../labels";
import { toast, toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import type { BookFilters } from "../schemas";
import type { BookListItem, BookPage, CatalogueFacets } from "../types";
import type { LibraryCounts } from "@/features/readers/types";

interface BookCatalogProps {
  initialPage: BookPage;
  initialFilters: BookFilters;
  facets: CatalogueFacets;
  staff: boolean;
  counts: LibraryCounts | null;
}

/** The ids of the list on screen, which a title page walks with the arrow keys. */
export const LIST_STORAGE_KEY = "catalogue:list";

const selectClass =
  "h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 sm:w-auto";

function filtersToQuery(filters: BookFilters) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return query.toString();
}

export function BookCatalog({
  initialPage,
  initialFilters,
  facets,
  staff,
  counts,
}: BookCatalogProps) {
  const router = useRouter();
  const [pageData, setPageData] = useState(initialPage);
  const [filters, setFilters] = useState<BookFilters>(initialFilters);
  const books = pageData.items;
  const lastPage = Math.max(1, Math.ceil(pageData.total / pageData.pageSize));
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const firstRun = useRef(true);

  const categoryOptions = facets.categories;
  const donors = facets.donors.filter((donor) => donor.copyCount > 0);
  const shelves = facets.cabinets.find((c) => c.cabinet === filters.cabinet)?.shelves ?? [];

  const update = useCallback((patch: Partial<BookFilters>) => {
    setFilters((prev) => ({ ...prev, page: undefined, ...patch }));
    setSelected(0);
  }, []);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const handler = setTimeout(async () => {
      setLoading(true);
      const result = await getBooks(filters);
      if (isErr(result)) toastActionError(result.error);
      else setPageData(result.value);
      setLoading(false);
      const query = filtersToQuery(filters);
      window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
    }, 250);
    return () => clearTimeout(handler);
  }, [filters]);

  useEffect(() => {
    sessionStorage.setItem(LIST_STORAGE_KEY, JSON.stringify(books.map((b) => b.id)));
  }, [books]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (event.key === "Escape" && target === searchRef.current) {
        update({ search: undefined });
        searchRef.current?.blur();
        return;
      }
      if (typing && target !== searchRef.current) return;
      if (!typing && event.key === "ArrowRight" && pageData.page < lastPage) {
        update({ page: pageData.page + 1 });
      } else if (!typing && event.key === "ArrowLeft" && pageData.page > 1) {
        update({ page: pageData.page - 1 });
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelected((i) => Math.min(i + 1, books.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelected((i) => Math.max(i - 1, 0));
      } else if (
        event.key === "Enter" &&
        !["BUTTON", "A"].includes(target.tagName) &&
        books[selected]
      ) {
        router.push(`/books/${books[selected].id}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [books, selected, router, update, pageData.page, lastPage]);

  const toggleHeart = async (book: BookListItem) => {
    const result = await setHeart({ bookId: book.id, hearted: !book.isHearted });
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    const hearted = result.value.hearted;
    setPageData((prev) => ({
      ...prev,
      items: prev.items.map((b) => (b.id === book.id ? { ...b, isHearted: hearted } : b)),
    }));
    toast({ title: hearted ? "Añadido a favoritos" : "Eliminado de favoritos" });
  };

  const chips = useMemo(() => {
    const list: { key: keyof BookFilters; label: string }[] = [];
    if (filters.search) list.push({ key: "search", label: `“${filters.search}”` });
    if (filters.category) list.push({ key: "category", label: `Categoría ${filters.category}` });
    if (filters.cabinet) list.push({ key: "cabinet", label: filters.cabinet });
    if (filters.shelf !== undefined) list.push({ key: "shelf", label: `Estante ${filters.shelf}` });
    if (filters.donor) {
      const name = facets.donors.find((d) => d.id === filters.donor)?.name;
      list.push({ key: "donor", label: `Donante ${name ?? ""}` });
    }
    if (filters.availability) {
      list.push({
        key: "availability",
        label: filters.availability === "available" ? "Disponibles" : "No disponibles",
      });
    }
    if (filters.unlabelled) list.push({ key: "unlabelled", label: "Sin etiqueta" });
    if (filters.unplaced) list.push({ key: "unplaced", label: "Sin ubicación" });
    return list;
  }, [filters, facets.donors]);

  const clearAll = () => {
    setFilters({});
    setSelected(0);
  };

  return (
    <div className="space-y-4">
      {counts && (
        <section aria-label="Resumen de la colección" className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-lg border bg-white px-3 py-3 shadow-xs sm:px-4">
            <p className="text-xl font-bold text-gray-950 sm:text-2xl">{counts.titleCount}</p>
            <p className="text-xs text-gray-600 sm:text-sm">títulos</p>
          </div>
          <div className="rounded-lg border bg-white px-3 py-3 shadow-xs sm:px-4">
            <p className="text-xl font-bold text-gray-950 sm:text-2xl">{counts.copyCount}</p>
            <p className="text-xs text-gray-600 sm:text-sm">ejemplares</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 shadow-xs sm:px-4">
            <p className="text-xl font-bold text-blue-800 sm:text-2xl">{counts.availableNow}</p>
            <p className="text-xs text-blue-900 sm:text-sm">disponibles ahora</p>
          </div>
        </section>
      )}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Catálogo</p>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950">Encuentra un título</h1>
        </div>
        <p className="hidden text-right text-xs text-gray-500 sm:block">
          {pageData.total} títulos · página {pageData.page}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-white p-2 shadow-xs">
        <div className="relative min-w-0 flex-1 basis-full sm:min-w-64 sm:basis-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            ref={searchRef}
            aria-label="Buscar"
            placeholder="Título, autor o código (/)"
            value={filters.search ?? ""}
            onChange={(e) => update({ search: e.target.value || undefined })}
            className="h-9 pl-9"
          />
        </div>

        <select
          aria-label="Categoría"
          className={selectClass}
          value={filters.category ?? ""}
          onChange={(e) => update({ category: e.target.value || undefined })}
        >
          <option value="">Todas las categorías</option>
          {categoryOptions.map((node) =>
            node.children.length === 0 ? (
              <option key={node.id} value={node.code}>
                {node.name} ({node.bookCount})
              </option>
            ) : (
              <optgroup key={node.id} label={node.name}>
                <option value={node.code}>
                  Todo {node.name} ({node.bookCount})
                </option>
                {node.children.map((child) => (
                  <option key={child.id} value={child.code}>
                    {child.name} ({child.bookCount})
                  </option>
                ))}
              </optgroup>
            ),
          )}
        </select>

        <select
          aria-label="Mueble"
          className={selectClass}
          value={filters.cabinet ?? ""}
          onChange={(e) => update({ cabinet: e.target.value || undefined, shelf: undefined })}
        >
          <option value="">Todos los muebles</option>
          {facets.cabinets.map((c) => (
            <option key={c.cabinet} value={c.cabinet}>
              {c.cabinet}
            </option>
          ))}
        </select>

        {filters.cabinet && (
          <select
            aria-label="Estante"
            className={selectClass}
            value={filters.shelf ?? ""}
            onChange={(e) =>
              update({ shelf: e.target.value === "" ? undefined : Number(e.target.value) })
            }
          >
            <option value="">Todos los estantes</option>
            {shelves.map((shelf) => (
              <option key={shelf} value={shelf}>
                Estante {shelf}
              </option>
            ))}
          </select>
        )}

        <select
          aria-label="Donante"
          className={selectClass}
          value={filters.donor ?? ""}
          onChange={(e) => update({ donor: e.target.value || undefined })}
        >
          <option value="">Todos los donantes</option>
          {donors.map((donor) => (
            <option key={donor.id} value={donor.id}>
              {donor.name} ({donor.copyCount})
            </option>
          ))}
        </select>

        <select
          aria-label="Disponibilidad"
          className={selectClass}
          value={filters.availability ?? ""}
          onChange={(e) =>
            update({ availability: (e.target.value || undefined) as BookFilters["availability"] })
          }
        >
          <option value="">Toda disponibilidad</option>
          <option value="available">Disponibles</option>
          <option value="unavailable">No disponibles</option>
        </select>

        <select
          aria-label="Ordenar catálogo"
          className={selectClass}
          value={filters.sort ?? "title"}
          onChange={(e) => update({ sort: e.target.value as BookFilters["sort"] })}
        >
          <option value="title">Orden: título</option>
          <option value="code">Orden: código</option>
        </select>

        {staff && (
          <>
            <label className="flex items-center gap-1.5 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={filters.unlabelled === "1"}
                onChange={(e) => update({ unlabelled: e.target.checked ? "1" : undefined })}
              />
              Sin etiqueta
            </label>
            <label className="flex items-center gap-1.5 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={filters.unplaced === "1"}
                onChange={(e) => update({ unplaced: e.target.checked ? "1" : undefined })}
              />
              Sin ubicación
            </label>
            <Button asChild size="sm" className="w-full sm:w-auto">
              <Link href="/admin/books/create">
                <Plus className="mr-1 h-4 w-4" /> Nuevo libro
              </Link>
            </Button>
          </>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => update({ [chip.key]: undefined })}
              className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-gray-700 hover:bg-gray-100"
            >
              {chip.label}
              <X className="h-3 w-3" aria-label="Quitar filtro" />
            </button>
          ))}
          <button type="button" onClick={clearAll} className="text-blue-600 hover:underline">
            Limpiar todo
          </button>
        </div>
      )}

      <p className="text-sm text-gray-500" aria-live="polite">
        {loading ? "Buscando…" : `${pageData.total} ${pageData.total === 1 ? "libro" : "libros"}`}
      </p>

      {books.length === 0 && !loading ? (
        <div className="rounded border border-dashed border-gray-200 py-16 text-center">
          {chips.length > 0 ? (
            <>
              <p className="font-medium text-gray-900">
                Ningún libro coincide con {chips.map((chip) => chip.label).join(", ")}.
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={clearAll}>
                Limpiar filtros
              </Button>
            </>
          ) : (
            <>
              <p className="font-medium text-gray-900">El catálogo está vacío.</p>
              {staff && (
                <Button asChild size="sm" className="mt-4">
                  <Link href="/admin/books/create">Registrar el primer libro</Link>
                </Button>
              )}
            </>
          )}
        </div>
      ) : (
        <div
          role="listbox"
          aria-label="Libros"
          className="divide-y rounded-lg border bg-white shadow-xs"
        >
          {books.map((book, index) => (
            <div
              key={book.id}
              role="option"
              aria-selected={index === selected}
              onMouseEnter={() => setSelected(index)}
              className={`grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-2 px-2 py-2.5 text-sm sm:gap-3 sm:px-3 md:grid-cols-[7rem_1fr_14rem_12rem_auto] ${
                index === selected ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
            >
              <span className="truncate font-mono text-[11px] text-gray-500">{book.code}</span>
              <Link href={`/books/${book.id}`} className="min-w-0">
                <span className="block truncate font-medium text-gray-900">{book.title}</span>
                {book.author && (
                  <span className="block truncate text-xs text-gray-500">{book.author}</span>
                )}
              </Link>
              <span className="hidden truncate text-gray-600 md:block">
                {book.category.parent
                  ? `${book.category.parent.name} › ${book.category.name}`
                  : book.category.name}
              </span>
              <span
                className={`hidden text-xs md:block ${
                  book.lendableCount > 0 ? "text-green-700" : "text-gray-500"
                }`}
              >
                {availabilityLabel(book.lendableCount, book.copyCount)}
              </span>
              <span className="flex items-center gap-1">
                {staff && (
                  <Link
                    href={`/admin/books/${book.id}`}
                    aria-label={`Editar ${book.title}`}
                    className="rounded p-1 text-gray-400 hover:text-gray-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                )}
                <button
                  type="button"
                  aria-label={book.isHearted ? "Quitar de favoritos" : "Añadir a favoritos"}
                  onClick={() => toggleHeart(book)}
                  className={`rounded p-1 ${
                    book.isHearted ? "text-red-500" : "text-gray-400 hover:text-red-500"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${book.isHearted ? "fill-current" : ""}`} />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {lastPage > 1 && (
        <nav
          aria-label="Páginas"
          className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="text-gray-500">
            {(pageData.page - 1) * pageData.pageSize + 1}–
            {(pageData.page - 1) * pageData.pageSize + books.length} de {pageData.total}
          </span>
          <span className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pageData.page <= 1}
              onClick={() => update({ page: pageData.page - 1 })}
            >
              Anterior
            </Button>
            <span className="text-gray-500">
              {pageData.page} / {lastPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pageData.page >= lastPage}
              onClick={() => update({ page: pageData.page + 1 })}
            >
              Siguiente
            </Button>
          </span>
        </nav>
      )}

      <p className="text-xs text-gray-400">
        / buscar · ↑ ↓ moverse · Enter abrir · ← → página · Esc limpiar la búsqueda
      </p>
    </div>
  );
}
