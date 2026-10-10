import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { Page } from "@/components/ui/page";

export default function NotFound() {
  return (
    <Page width="prose">
      <Empty
        title="Esta página no existe"
        action={
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            Buscar en el catálogo
          </Link>
        }
      >
        Puede que el enlace esté incompleto o que la página se haya movido.
      </Empty>
    </Page>
  );
}
