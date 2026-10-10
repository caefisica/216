import { Page } from "@/components/ui/page";

export default function Loading() {
  return (
    <Page aria-busy role="status">
      <span className="sr-only">Cargando…</span>
      <div className="grid animate-pulse gap-3" aria-hidden>
        <div className="h-12 rounded-md bg-sunken" />
        <div className="h-control w-2/3 rounded-md bg-sunken" />
        <div className="mt-6 grid gap-4">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex gap-3">
              <div className="aspect-[2/3] w-12 rounded-sm bg-sunken" />
              <div className="grid flex-1 content-start gap-2">
                <div className="h-5 w-3/4 rounded-sm bg-sunken" />
                <div className="h-4 w-1/3 rounded-sm bg-sunken" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}
