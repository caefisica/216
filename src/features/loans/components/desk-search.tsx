"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/field";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { DESK_LIST_ID, DESK_SEARCH_DELAY_MS, DESK_SEARCH_ID } from "../constants";
import type { DeskView } from "../schemas";

/** Clicks the decision when the list has one enabled decision. */
function actOnOnlyRow() {
  const actions = document.querySelectorAll<HTMLButtonElement>(`#${DESK_LIST_ID} [data-primary]`);
  if (actions.length === 1 && !actions[0].disabled) actions[0].click();
}

/**
 * Enter activates the row's main button when the search leaves one match.
 */
export function DeskSearch({
  view,
  query,
  children,
}: {
  view: DeskView;
  query: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(query);
  const sent = useRef(query);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // The text Enter was pressed on, kept until the list of that text arrives or the chance is lost.
  const armed = useRef<string | null>(null);
  const frame = useRef<number>(undefined);

  function disarm() {
    armed.current = null;
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
  }

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      disarm();
    },
    [],
  );

  // Another list is not the one Enter was pressed on.
  useEffect(disarm, [view]);

  // Follow URL changes from other links after the field's own navigation settles.
  useEffect(() => {
    if (pending || query === sent.current) return;
    sent.current = query;
    setValue(query);
  }, [pending, query]);

  // Apply an Enter search after its filtered list arrives. A navigation that ended on another
  // list, whether it failed or a link replaced it, forfeits the Enter.
  useEffect(() => {
    if (armed.current === null || pending) return;
    const text = armed.current;
    armed.current = null;
    if (text === query) frame.current = requestAnimationFrame(actOnOnlyRow);
  }, [pending, query]);

  useEffect(() => {
    function focusOnSlash(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey) return;
      if ((event.target as HTMLElement).closest("input, textarea, select, [contenteditable]"))
        return;
      event.preventDefault();
      document.getElementById(DESK_SEARCH_ID)?.focus();
    }
    document.addEventListener("keydown", focusOnSlash);
    return () => document.removeEventListener("keydown", focusOnSlash);
  }, []);

  /** Starts the navigation to `next`; false when the URL already is, or is on its way to, that text. */
  function go(next: string) {
    const text = next.trim();
    if (text === sent.current) return false;
    sent.current = text;
    const params = new URLSearchParams({ view });
    if (text) params.set("q", text);
    startTransition(() => {
      router.replace(`/admin/loans?${params}`, { scroll: false });
    });
    return true;
  }

  return (
    <>
      <form
        role="search"
        aria-label="Préstamos"
        onSubmit={(event) => {
          event.preventDefault();
          clearTimeout(timer.current);
          const text = value.trim();
          disarm();
          // The list on screen answers the text only once its navigation has landed.
          if (go(text) || pending) armed.current = text;
          else if (text === query) actOnOnlyRow();
        }}
      >
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id={DESK_SEARCH_ID}
            type="search"
            name="q"
            aria-label="Buscar lector, título o código de ejemplar"
            placeholder="Lector, título o código de ejemplar"
            autoComplete="off"
            autoFocus
            enterKeyHint="go"
            value={value}
            className="h-11 rounded-md pl-10 pr-11 [&::-webkit-search-cancel-button]:hidden"
            onChange={(event) => {
              const next = event.target.value;
              setValue(next);
              disarm();
              clearTimeout(timer.current);
              timer.current = setTimeout(() => go(next), DESK_SEARCH_DELAY_MS);
            }}
          />
          {!value && <Kbd className="absolute right-3.5 top-1/2 -translate-y-1/2">/</Kbd>}
        </div>
      </form>

      <div
        aria-busy={pending}
        inert={pending}
        className={cn(
          "mt-2 transition-opacity duration-150 ease-out",
          pending && "opacity-55 delay-150",
        )}
      >
        {children}
      </div>
    </>
  );
}
