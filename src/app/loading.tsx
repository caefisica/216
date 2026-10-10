import { Page } from "@/components/ui/page";

/** Every route shares this, so it draws no layout of its own: a title and a few lines of text. */
export default function Loading() {
  return (
    <Page aria-busy role="status">
      <span className="sr-only">Cargando…</span>
      <div className="grid animate-pulse gap-3" aria-hidden>
        <div className="h-7 w-1/2 rounded-sm bg-sunken" />
        <div className="h-4 w-full rounded-sm bg-sunken" />
        <div className="h-4 w-5/6 rounded-sm bg-sunken" />
        <div className="h-4 w-2/3 rounded-sm bg-sunken" />
      </div>
    </Page>
  );
}
