import { CardList, CardRow } from "@/components/ui/card";
import { Page } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Page width="prose" aria-busy role="status">
      <span className="sr-only">Cargando tus libros…</span>
      <div aria-hidden>
        <Skeleton className="h-8 w-40 sm:h-10" />
        <Skeleton className="mt-8 mb-3 h-5 w-16" />
        <CardList>
          {[0, 1].map((row) => (
            <CardRow
              key={row}
              className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-x-5"
            >
              <Skeleton className="aspect-[2/3] w-full" />
              <div className="grid content-center gap-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="mt-1 h-6 w-36 rounded-full" />
              </div>
            </CardRow>
          ))}
        </CardList>
      </div>
    </Page>
  );
}
