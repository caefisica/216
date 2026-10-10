"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/field";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { DESK_LIST_ID, DESK_SEARCH_ID } from "../constants";
import type { DeskView } from "../schemas";

const SEARCH_DELAY_MS = 250;

/** Presses the one decision left in the list, if there is exactly one. */
function actOnOnlyRow() {
  const actions = document.querySelectorAll<HTMLButtonElement>(`#${DESK_LIST_ID} [data-primary]`);
  if (actions.length === 1 && !actions[0].disabled) actions[0].click();
}

/**
 * The librarian types a reader, a title or a copy code and the list narrows. Enter on a single
 * match does what the row's main button does, so a return is: scan or type, Enter.
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
  const armed = useRef(false);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Other links on the page change the URL under the field. The field follows once it is idle.
  useEffect(() => {
    if (pending || query === sent.current) return;
    sent.current = query;
    setValue(query);
  }, [pending, query]);

  // A search started by Enter acts as soon as its list has arrived.
  useEffect(() => {
    if (!armed.current || pending || query !== sent.current) return;
    armed.current = false;
    requestAnimationFrame(actOnOnlyRow);
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
          if (go(value)) armed.current = true;
          else actOnOnlyRow();
        }}
      >
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
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
            className="h-12 pl-9 pr-10 text-base"
            onChange={(event) => {
              const next = event.target.value;
              setValue(next);
              clearTimeout(timer.current);
              timer.current = setTimeout(() => go(next), SEARCH_DELAY_MS);
            }}
          />
          {!value && <Kbd className="absolute right-3 top-1/2 -translate-y-1/2">/</Kbd>}
        </div>
      </form>

      <div
        aria-busy={pending}
        className={cn("mt-4 transition-opacity duration-150", pending && "opacity-50")}
      >
        {children}
      </div>
    </>
  );
}
