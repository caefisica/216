import Link from "next/link";
import { Empty } from "@/components/ui/empty";
import { Page } from "@/components/ui/page";
import { listDonorGifts } from "@/features/donors/repository";

export default async function DonorsPage() {
  const { donors, totalCopies } = await listDonorGifts();

  return (
    <Page width="prose">
      <h1 className="font-serif text-2xl font-semibold">Donantes</h1>
      <p className="mt-2 text-muted-foreground">
        {donors.length === 0
          ? "Los libros donados a la biblioteca aparecerán aquí."
          : `${totalCopies} ${totalCopies === 1 ? "ejemplar llegó" : "ejemplares llegaron"} como donación.`}
      </p>

      {donors.length === 0 ? (
        <Empty title="Todavía no hay donaciones registradas" className="mt-8" />
      ) : (
        <ul className="mt-6 grid gap-8">
          {donors.map((donor) => (
            <li key={donor.id}>
              <h2 className="text-lg font-semibold">{donor.name}</h2>
              {donor.motivation && <p className="text-muted-foreground">“{donor.motivation}”</p>}
              <ul className="mt-2 divide-y border-y">
                {donor.books.map((book) => (
                  <li key={book.id}>
                    <Link
                      href={`/books/${book.id}`}
                      className="flex min-h-control flex-col justify-center py-2 hover:bg-sunken sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                    >
                      <span className="font-medium">{book.title}</span>
                      <span className="truncate text-muted-foreground">
                        {book.author ?? "Autor no registrado"}
                        {book.copyCount > 1 ? ` · ${book.copyCount} ejemplares` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
