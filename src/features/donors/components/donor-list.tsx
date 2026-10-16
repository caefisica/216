import Link from "next/link";

import { Disclosure } from "@/components/ui/disclosure";
import type { listDonorGifts } from "../repository";

type Donor = Awaited<ReturnType<typeof listDonorGifts>>["donors"][number];

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Every donor name stays visible. A row opens to the donor's words and books. */
export function DonorList({ donors }: { donors: Donor[] }) {
  return (
    <ul className="divide-y border-y">
      {donors.map((donor) => (
        <li key={donor.id} className="py-1">
          <Disclosure title={donor.name} detail={plural(donor.copyCount, "ejemplar", "ejemplares")}>
            {donor.motivation && <p className="mb-3 pl-6 text-pretty">{donor.motivation}</p>}
            <ul className="grid gap-1 pl-6">
              {donor.books.map((book) => (
                <li key={book.id}>
                  <Link
                    href={`/books/${book.id}`}
                    className="-mx-2 grid min-h-control content-center rounded-md px-2 py-1 transition-colors hover:bg-sunken"
                  >
                    <span className="text-pretty">{book.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {book.author ?? "Autor no registrado"}
                      {book.copyCount > 1 ? ` · ${book.copyCount} ejemplares` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Disclosure>
        </li>
      ))}
    </ul>
  );
}
