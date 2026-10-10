import { Page } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Page width="prose" aria-busy role="status">
      <span className="sr-only">Cargando…</span>
      <div className="grid gap-4" aria-hidden>
        <Skeleton className="h-8 w-3/4 sm:h-10" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </Page>
  );
}
