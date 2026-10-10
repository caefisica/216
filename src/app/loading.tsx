import { Page } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Page aria-busy role="status">
      <span className="sr-only">Cargando…</span>
      <div className="grid gap-3" aria-hidden>
        <Skeleton className="mb-3 h-9 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </Page>
  );
}
