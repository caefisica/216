"use client";

import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { Page } from "@/components/ui/page";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <Page width="prose">
      <Empty
        as="h1"
        title="Algo salió mal"
        action={
          <Button variant="primary" onClick={reset}>
            Reintentar
          </Button>
        }
      >
        No pudimos cargar esta página. Tus datos no cambiaron.
      </Empty>
    </Page>
  );
}
