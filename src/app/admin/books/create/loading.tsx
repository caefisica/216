import { Page } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Page width="prose" aria-busy role="status">
      <span className="sr-only">Cargando el formulario…</span>
      <div className="grid gap-4" aria-hidden>
        <Skeleton className="mb-2 h-8 w-56 sm:h-10" />
        <Skeleton className="h-control w-full rounded-sm" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-control rounded-sm" />
          <Skeleton className="h-control rounded-sm" />
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <Skeleton className="h-control rounded-sm" />
          <Skeleton className="h-control rounded-sm" />
        </div>
        <Skeleton className="h-control w-36 rounded-sm" />
      </div>
    </Page>
  );
}
