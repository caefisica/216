import { CardList, CardRow } from "@/components/ui/card";
import { Page } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Page aria-busy role="status">
      <span className="sr-only">Cargando los préstamos…</span>
      <div className="grid gap-4" aria-hidden>
        <Skeleton className="h-8 w-40 sm:h-10" />
        <Skeleton className="h-control w-64 max-w-full rounded-md" />
        <Skeleton className="h-11 w-full rounded-md" />
        <CardList className="mt-2">
          {[0, 1, 2].map((row) => (
            <CardRow key={row} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6">
              <div className="grid gap-2">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-4 w-2/5" />
              </div>
              <Skeleton className="h-control w-full rounded-sm sm:w-72" />
            </CardRow>
          ))}
        </CardList>
      </div>
    </Page>
  );
}
