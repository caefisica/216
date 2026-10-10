import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { Page } from "@/components/ui/page";

export function NotFoundState() {
  return (
    <Page width="prose">
      <Empty
        title="No encontramos este libro"
        action={
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            Buscar en el catálogo
          </Link>
        }
      >
        Puede que el enlace esté incompleto o que el libro ya no esté en el catálogo.
      </Empty>
    </Page>
  );
}
