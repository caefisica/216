"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/field";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { rememberCatalogue } from "../catalogue-memory";
import type { BookFilters } from "../schemas";
import type { CatalogueFacets } from "../types";

type Review = "" | "unlabelled" | "unplaced";

interface CatalogueSearchProps {
  filters: BookFilters;
  categories: CatalogueFacets["categories"];
  /** Present only for staff: the copies that still need a label or a place. */
  review?: Pick<CatalogueFacets["copyHealth"], "unlabelled" | "unplaced">;
  children: React.ReactNode;
}

function toQuery(search: string, category: string, available: boolean, review: Review) {
  const query = new URLSearchParams();
  if (search.trim()) query.set("search", search.trim());
  if (category) query.set("category", category);
  if (available) query.set("availability", "available");
  if (review) query.set(review, "1");
  return query.toString();
}

const SEARCH_DELAY_MS = 250;

/**
 * The URL is the state: every change is a navigation, so the back button, a shared link and a
 * reload all return to the same list. The list itself arrives as `children`, rendered on the server.
 */
export function CatalogueSearch({ filters, categories, review, children }: CatalogueSearchProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const urlReview: Review = filters.unlabelled ? "unlabelled" : filters.unplaced ? "unplaced" : "";
  const urlQuery = toQuery(
    filters.search ?? "",
    filters.category ?? "",
    filters.availability === "available",
    urlReview,
  );
  const location = useSearchParams().toString();
  useEffect(() => rememberCatalogue(location), [location]);
  const sent = useRef(urlQuery);
  const [search, setSearch] = useState(filters.search ?? "");
  const [category, setCategory] = useState(filters.category ?? "");
  const [available, setAvailable] = useState(filters.availability === "available");
  const [reviewing, setReviewing] = useState<Review>(urlReview);

  // A link elsewhere on the page (for example "Quitar filtros") changes the URL under us. While
  // our own navigation is pending the fields are ahead of the URL, so they are left alone.
  useEffect(() => {
    if (pending || urlQuery === sent.current) return;
    sent.current = urlQuery;
    setSearch(filters.search ?? "");
    setCategory(filters.category ?? "");
    setAvailable(filters.availability === "available");
    setReviewing(urlReview);
  }, [pending, urlQuery, filters.search, filters.category, filters.availability, urlReview]);

  function go(next: { search: string; category: string; available: boolean; review: Review }) {
    const query = toQuery(next.search, next.category, next.available, next.review);
    if (query === sent.current) return;
    sent.current = query;
    startTransition(() => {
      router.replace(query ? `/?${query}` : "/", { scroll: false });
    });
  }

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    function focusOnSlash(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (event.key !== "/" || event.metaKey || event.ctrlKey) return;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
      input.current?.focus();
    }
    document.addEventListener("keydown", focusOnSlash);
    return () => document.removeEventListener("keydown", focusOnSlash);
  }, []);

  return (
    <>
      <form
        role="search"
        aria-label="Catálogo"
        className="grid grid-cols-[minmax(0,1fr)] gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          clearTimeout(timer.current);
          go({ search, category, available, review: reviewing });
        }}
      >
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={input}
            type="search"
            name="search"
            aria-label="Buscar por título, autor o código"
            placeholder="Título, autor o código"
            autoComplete="off"
            enterKeyHint="search"
            value={search}
            className="h-12 pl-9 pr-10 text-base sm:h-12"
            onChange={(event) => {
              setSearch(event.target.value);
              clearTimeout(timer.current);
              const value = event.target.value;
              timer.current = setTimeout(
                () => go({ search: value, category, available, review: reviewing }),
                SEARCH_DELAY_MS,
              );
            }}
          />
          {!search && <Kbd className="absolute right-3 top-1/2 -translate-y-1/2">/</Kbd>}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Select
            aria-label="Categoría"
            value={category}
            className="w-auto max-w-full"
            onChange={(event) => {
              setCategory(event.target.value);
              go({ search, category: event.target.value, available, review: reviewing });
            }}
          >
            <option value="">Todas las categorías</option>
            {categories.map((root) => (
              <optgroup key={root.id} label={root.name}>
                <option value={root.code}>Todo en {root.name}</option>
                {root.children.map((child) => (
                  <option key={child.id} value={child.code}>
                    {child.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>

          <label className="inline-flex min-h-control cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={available}
              className="size-4 accent-primary"
              onChange={(event) => {
                setAvailable(event.target.checked);
                go({ search, category, available: event.target.checked, review: reviewing });
              }}
            />
            Solo disponibles
          </label>

          {review && (
            <Select
              aria-label="Revisión de ejemplares"
              value={reviewing}
              className="w-auto max-w-full"
              onChange={(event) => {
                const value = event.target.value as Review;
                setReviewing(value);
                go({ search, category, available, review: value });
              }}
            >
              <option value="">Todos los ejemplares</option>
              <option value="unlabelled">Sin etiqueta ({review.unlabelled})</option>
              <option value="unplaced">Sin ubicación ({review.unplaced})</option>
            </Select>
          )}
        </div>
      </form>

      <div
        aria-busy={pending}
        className={cn("mt-6 transition-opacity duration-150", pending && "opacity-50")}
      >
        {children}
      </div>
    </>
  );
}
