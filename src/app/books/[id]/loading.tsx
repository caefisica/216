import { Card } from "@/components/ui/card";
import { Page } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Page aria-busy role="status">
      <span className="sr-only">Cargando el libro…</span>
      <div aria-hidden>
        <div className="flex min-h-control items-center">
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="mt-4 grid gap-6 sm:mt-6 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
          <Skeleton className="aspect-[2/3] w-32 sm:w-full" />
          <div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-3 h-8 w-4/5 sm:h-10" />
            <Skeleton className="mt-2 h-8 w-1/2 sm:h-10" />
            <Skeleton className="mt-3 h-5 w-1/3" />
            <Card className="mt-6 grid gap-3 p-4 sm:p-5">
              <Skeleton className="h-6 w-36 rounded-full" />
              <Skeleton className="h-4 w-48" />
            </Card>
            <div className="mt-8 flex min-h-control items-center">
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
