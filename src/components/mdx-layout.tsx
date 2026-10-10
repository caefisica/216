import { Page } from "@/components/ui/page";

export default function MdxLayout({ children }: { children: React.ReactNode }) {
  return (
    <Page width="prose" className="grid gap-3">
      {children}
    </Page>
  );
}
