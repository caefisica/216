"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { recalledCatalogue } from "@/features/books/catalogue-memory";

/** Leads to the catalogue with the search, filters and page the reader left. */
export function BackLink() {
  const [href, setHref] = useState("/");
  useEffect(() => setHref(recalledCatalogue()), []);

  return (
    <Link
      href={href}
      className="-ml-2 inline-flex min-h-control items-center gap-1.5 rounded-sm px-2 text-sm font-medium text-muted-foreground transition-colors duration-100 hover:bg-sunken hover:text-foreground"
    >
      <ArrowLeft aria-hidden className="size-4" />
      Catálogo
    </Link>
  );
}
