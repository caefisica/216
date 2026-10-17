"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { recalledCatalogue } from "@/features/books/catalogue-memory";

// The remembered query never changes while this page is open, so there is nothing to subscribe to.
const subscribeNever = () => () => {};

/** Leads to the catalogue with the search, filters and page the reader left. */
export function BackLink() {
  const href = useSyncExternalStore(subscribeNever, recalledCatalogue, () => "/");

  return (
    <Link
      href={href}
      className="-ml-2 inline-flex min-h-control items-center gap-2 rounded-md px-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-sunken hover:text-foreground"
    >
      <ArrowLeft aria-hidden className="size-4" />
      Catálogo
    </Link>
  );
}
