"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, LayoutGrid, List, Pencil, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookCover } from "@/components/catalogue/book-cover";
import BookClient from "@/app/books/[id]/book-client";
import { getBookById, getBooks, setHeart } from "../actions";
import { availabilityLabel } from "../labels";
import { toast, toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import type { BookFilters } from "../schemas";
import type { BookDetailed, BookListItem, BookPage, CatalogueFacets } from "../types";
import type { AuthUser } from "@/features/auth/core/session";
import type { LibraryCounts } from "@/features/readers/types";
import { LIST_STORAGE_KEY } from "../catalogue-state";

interface BookCatalogProps {
  initialPage: BookPage;
  initialFilters: BookFilters;
  facets: CatalogueFacets;
  staff: boolean;
  counts: LibraryCounts | null;
  user: AuthUser | null;
  initialSelectedBook: BookDetailed | null;
}

const selectClass =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20 sm:w-auto";

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
  user,
  initialSelectedBook,
}: BookCatalogProps) {
  const router = useRouter();
  const [pageData, setPageData] = useState(initialPage);
  const [filters, setFilters] = useState<BookFilters>(initialFilters);
  const books = pageData.items;
  const lastPage = Math.max(1, Math.ceil(pageData.total / pageData.pageSize));
  const [selected, setSelected] = useState(() =>
    initialSelectedBook ? books.findIndex((book) => book.id === initialSelectedBook.id) : 0,
  );
  const [selectedBook, setSelectedBook] = useState(initialSelectedBook);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"list" | "grid">("list");
  const searchRef = useRef<HTMLInputElement>(null);
  const firstRun = useRef(true);
  const detailRequest = useRef(0);

  const categoryOptions = facets.categories;
  const donors = facets.donors.filter((donor) => donor.copyCount > 0);
  const shelves = facets.cabinets.find((c) => c.cabinet === filters.cabinet)?.shelves ?? [];

  const writeSelectionUrl = useCallback((bookId: string | null, replace = true) => {
    const params = new URLSearchParams(window.location.search);
    if (bookId) params.set("book", bookId);
    else params.delete("book");
    const query = params.toString();
    const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
  }, []);

  const closeDetail = useCallback(() => {
    detailRequest.current += 1;
    setSelectedBook(null);
    setDetailLoading(false);
    setDetailError(false);
    writeSelectionUrl(null);
  }, [writeSelectionUrl]);

  const showInPane = useCallback(
    async (bookId: string, index: number) => {
      setSelected(index);
      writeSelectionUrl(bookId);
      const request = detailRequest.current + 1;
      detailRequest.current = request;
      if (selectedBook?.id === bookId) {
        setDetailLoading(false);
        return;
      }

      setDetailError(false);
      setDetailLoading(true);
      const result = await getBookById(bookId);
      if (request !== detailRequest.current) return;
      if (isErr(result)) {
        setSelectedBook(null);
        setDetailError(true);
      } else {
        setSelectedBook(result.value);
      }
      setDetailLoading(false);
    },
    [selectedBook?.id, writeSelectionUrl],
  );

  const openRow = (bookId: string, index: number) => {
    if (window.innerWidth < 1024) router.push(`/books/${bookId}`);
    else void showInPane(bookId, index);
  };

  const showView = (next: "list" | "grid") => {
    setView(next);
    if (next === "grid") closeDetail();
  };

  const update = useCallback(
    (patch: Partial<BookFilters>) => {
      setFilters((prev) => ({ ...prev, page: undefined, ...patch }));
      setSelected(0);
      closeDetail();
    },
    [closeDetail],
  );

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
      const queryParams = new URLSearchParams(filtersToQuery(filters));
      const selectedBookId = new URLSearchParams(window.location.search).get("book");
      if (selectedBookId) queryParams.set("book", selectedBookId);
      const query = queryParams.toString();
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
      if (event.key === "Escape" && (selectedBook || detailLoading || detailError)) {
        event.preventDefault();
        closeDetail();
        return;
      }
      if (typing && target !== searchRef.current) return;
      if (!typing && event.key === "ArrowRight" && pageData.page < lastPage) {
        update({ page: pageData.page + 1 });
      } else if (!typing && event.key === "ArrowLeft" && pageData.page > 1) {
        update({ page: pageData.page - 1 });
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        const next = selected < 0 ? 0 : Math.min(Math.max(selected + step, 0), books.length - 1);
        if (!books[next]) return;
        if (view === "list" && window.innerWidth >= 1024) void showInPane(books[next].id, next);
        else setSelected(next);
      } else if (event.key === "Enter" && !["BUTTON", "A"].includes(target.tagName)) {
        const bookId = books[selected]?.id ?? selectedBook?.id;
        if (bookId) router.push(`/books/${bookId}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    books,
    selected,
    selectedBook,
    router,
    update,
    closeDetail,
    showInPane,
    view,
    pageData.page,
    lastPage,
    detailLoading,
    detailError,
  ]);

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
    closeDetail();
  };

  const onBookClick = (event: React.MouseEvent, bookId: string, index: number) => {
    if (window.innerWidth < 1024) return;
    event.preventDefault();
    void showInPane(bookId, index);
  };

  return (
    <div className="space-y-6">
      {counts && (
        <section aria-label="Resumen de la colección" className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="surface p-3 sm:p-4">
            <p className="text-xl font-semibold tracking-tight sm:text-2xl">{counts.titleCount}</p>
            <p className="text-xs text-muted-foreground sm:text-sm">títulos</p>
          </div>
          <div className="surface p-3 sm:p-4">
            <p className="text-xl font-semibold tracking-tight sm:text-2xl">{counts.copyCount}</p>
            <p className="text-xs text-muted-foreground sm:text-sm">ejemplares</p>
          </div>
          <div className="surface border-l-4 border-l-status-available p-3 sm:p-4">
            <p className="text-xl font-semibold tracking-tight text-status-available sm:text-2xl">
              {counts.availableNow}
            </p>
            <p className="text-xs text-muted-foreground sm:text-sm">disponibles ahora</p>
          </div>
        </section>
      )}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Colección</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Encuentra un título</h1>
        </div>
        <p className="hidden text-right text-xs text-muted-foreground sm:block">
          {pageData.total} títulos · página {pageData.page}
        </p>
      </div>

      <div className="surface flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-0 flex-1 basis-full sm:min-w-64 sm:basis-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            aria-label="Buscar"
            placeholder="Título, autor o código (/)"
            value={filters.search ?? ""}
            onChange={(e) => update({ search: e.target.value || undefined })}
            className="h-10 border-border bg-surface-muted pl-9"
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
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={filters.unlabelled === "1"}
                onChange={(e) => update({ unlabelled: e.target.checked ? "1" : undefined })}
              />
              Sin etiqueta
            </label>
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={filters.unplaced === "1"}
                onChange={(e) => update({ unplaced: e.target.checked ? "1" : undefined })}
              />
              Sin ubicación
            </label>
            <Button asChild size="sm" className="w-full sm:w-auto">
              <Link href="/admin/books/create">
                <Plus className="mr-1 h-4 w-4" /> Nuevo título
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
              className="inline-flex items-center gap-1 rounded border border-border bg-surface-muted px-2 py-0.5 text-muted-foreground hover:bg-accent"
            >
              {chip.label}
              <X className="h-3 w-3" aria-label="Quitar filtro" />
            </button>
          ))}
          <button type="button" onClick={clearAll} className="text-primary hover:underline">
            Limpiar todo
          </button>
        </div>
      )}

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {loading ? "Buscando…" : `${pageData.total} ${pageData.total === 1 ? "libro" : "libros"}`}
      </p>

      <div
        className={
          view === "list"
            ? "lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_28rem]"
            : undefined
        }
      >
        <div className="min-w-0">
          {books.length === 0 && !loading ? (
            <div className="surface border-dashed py-16 text-center">
              {chips.length > 0 ? (
                <>
                  <p className="font-medium">
                    Ningún libro coincide con {chips.map((chip) => chip.label).join(", ")}.
                  </p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={clearAll}>
                    Limpiar filtros
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-medium">El catálogo está vacío.</p>
                  {staff && (
                    <Button asChild size="sm" className="mt-4">
                      <Link href="/admin/books/create">Registrar el primer libro</Link>
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">Vista</span>
                <div
                  className="flex rounded-md border border-border bg-surface p-0.5"
                  role="group"
                  aria-label="Vista del catálogo"
                >
                  <button
                    type="button"
                    aria-label="Vista de lista"
                    aria-pressed={view === "list"}
                    onClick={() => showView("list")}
                    className={`rounded p-1.5 ${
                      view === "list" ? "bg-foreground text-background" : "text-muted-foreground"
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Vista de cuadrícula"
                    aria-pressed={view === "grid"}
                    onClick={() => showView("grid")}
                    className={`rounded p-1.5 ${
                      view === "grid" ? "bg-foreground text-background" : "text-muted-foreground"
                    }`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {view === "grid" ? (
                <div
                  role="list"
                  aria-label="Libros"
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
                >
                  {books.map((book, index) => (
                    <article
                      key={book.id}
                      role="listitem"
                      onMouseEnter={() => setSelected(index)}
                      className={`surface relative overflow-hidden p-2 transition ${index === selected ? "ring-2 ring-ring" : ""}`}
                    >
                      <Link href={`/books/${book.id}`} className="block">
                        <BookCover
                          title={book.title}
                          author={book.author}
                          category={book.category.name}
                          imageUrl={book.imageUrl}
                          priority={index < 2}
                        />
                        <div className="px-1 pb-1 pt-3">
                          {book.imageUrl && (
                            <>
                              <p className="line-clamp-2 text-sm font-semibold leading-tight">
                                {book.title}
                              </p>
                              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                                {book.author ?? "Autor no registrado"}
                              </p>
                            </>
                          )}
                          <p
                            className={`mt-3 text-[0.7rem] font-medium ${
                              book.lendableCount > 0
                                ? "text-status-available"
                                : "text-muted-foreground"
                            }`}
                          >
                            {availabilityLabel(book.lendableCount, book.copyCount)}
                          </p>
                        </div>
                      </Link>
                      <button
                        type="button"
                        aria-label={book.isHearted ? "Quitar de favoritos" : "Añadir a favoritos"}
                        onClick={() => toggleHeart(book)}
                        className={`absolute right-3 top-3 rounded bg-surface/90 p-1 transition hover:bg-surface ${
                          book.isHearted
                            ? "text-status-favorite"
                            : "text-muted-foreground hover:text-status-favorite"
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${book.isHearted ? "fill-current" : ""}`} />
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div
                  role="listbox"
                  aria-label="Libros"
                  className="surface divide-y overflow-hidden"
                >
                  {books.map((book, index) => (
                    <div
                      key={book.id}
                      role="option"
                      aria-selected={index === selected}
                      onClick={(event) => {
                        if ((event.target as HTMLElement).closest("a, button")) return;
                        openRow(book.id, index);
                      }}
                      onMouseEnter={() => setSelected(index)}
                      className={`grid cursor-pointer grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-sm transition md:grid-cols-[5rem_minmax(0,1fr)_7.5rem_auto] 2xl:grid-cols-[6rem_minmax(0,1fr)_minmax(10rem,13rem)_7.5rem_auto] ${
                        index === selected ? "bg-surface-muted" : "hover:bg-surface-muted/60"
                      }`}
                    >
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {book.code}
                      </span>
                      <Link
                        href={`/books/${book.id}`}
                        className="col-span-1 min-w-0"
                        onClick={(event) => onBookClick(event, book.id, index)}
                      >
                        <span className="block truncate font-medium">{book.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {book.author ?? "Autor no registrado"}
                        </span>
                      </Link>
                      <span className="hidden truncate text-muted-foreground 2xl:block">
                        {book.category.parent
                          ? `${book.category.parent.name} › ${book.category.name}`
                          : book.category.name}
                      </span>
                      <span
                        className={`hidden whitespace-nowrap text-xs md:block ${
                          book.lendableCount > 0 ? "text-status-available" : "text-muted-foreground"
                        }`}
                      >
                        {availabilityLabel(book.lendableCount, book.copyCount)}
                      </span>
                      <span className="flex items-center justify-end gap-1">
                        {staff && (
                          <Link
                            href={`/admin/books/${book.id}`}
                            aria-label={`Editar ${book.title}`}
                            className="rounded p-1 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        )}
                        <button
                          type="button"
                          aria-label={book.isHearted ? "Quitar de favoritos" : "Añadir a favoritos"}
                          onClick={() => toggleHeart(book)}
                          className={`rounded p-1 ${
                            book.isHearted
                              ? "text-status-favorite"
                              : "text-muted-foreground hover:text-status-favorite"
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${book.isHearted ? "fill-current" : ""}`} />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {lastPage > 1 && (
            <nav
              aria-label="Páginas"
              className="mt-6 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-muted-foreground">
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
                <span className="text-muted-foreground">
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
        </div>

        {view === "list" && (
          <div className="hidden min-w-0 lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
            {detailError ? (
              <div className="surface flex min-h-[38rem] items-center justify-center p-6 text-center">
                <div>
                  <p className="font-medium">No se pudo cargar el título.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Selecciona otro libro para continuar.
                  </p>
                </div>
              </div>
            ) : selectedBook ? (
              <div
                aria-busy={detailLoading}
                className={`transition-opacity ${detailLoading ? "opacity-60" : ""}`}
              >
                <BookClient
                  key={selectedBook.id}
                  book={selectedBook}
                  user={user}
                  variant="pane"
                  onClose={closeDetail}
                />
              </div>
            ) : detailLoading ? (
              <div
                data-testid="catalogue-detail-loading"
                className="surface flex min-h-[38rem] items-center justify-center p-6 text-center"
                aria-live="polite"
              >
                <div>
                  <p className="font-medium">Cargando el título…</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Espera un momento para ver sus ejemplares y disponibilidad.
                  </p>
                </div>
              </div>
            ) : (
              <div className="surface flex min-h-[38rem] items-center justify-center p-6 text-center">
                <div>
                  <p className="font-medium">Selecciona un título.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Elige una fila para ver sus detalles aquí sin perder tus filtros.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        / buscar · ↑ ↓ seleccionar · Enter abrir · Esc cerrar
      </p>
    </div>
  );
}
