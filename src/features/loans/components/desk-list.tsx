"use client";

import type { KeyboardEvent } from "react";
import { CardList } from "@/components/ui/card";
import { DESK_LIST_ID } from "../constants";

/** Up and Down walk the main buttons of the rows, so a whole queue is cleared from the keyboard. */
export function DeskList({ label, children }: { label: string; children: React.ReactNode }) {
  function walk(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const actions = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-primary]")];
    if (actions.length === 0) return;
    const at = actions.indexOf(document.activeElement as HTMLButtonElement);
    if (at === -1 && document.activeElement !== event.currentTarget) return;
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : -1;
    const next = at === -1 ? (step === 1 ? 0 : actions.length - 1) : at + step;
    actions[Math.min(Math.max(next, 0), actions.length - 1)].focus();
  }

  return (
    <CardList
      id={DESK_LIST_ID}
      tabIndex={-1}
      aria-label={label}
      onKeyDown={walk}
      className="focus-visible:outline-none"
    >
      {children}
    </CardList>
  );
}
