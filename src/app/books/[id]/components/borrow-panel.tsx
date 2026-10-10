"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { createBorrowRequest } from "@/features/books/actions";
import { toastActionError } from "@/hooks/use-toast";
import { dueSuffix } from "@/features/loans/format";
import { isErr } from "@/lib/result";
import type { ReaderRequest } from "@/features/books/types";

interface BorrowPanelProps {
  bookId: string;
  /** Anonymous readers have no session. Unverified readers have not confirmed their email. */
  reader: "anonymous" | "unverified" | "verified";
  request: ReaderRequest | null;
  now: Date;
}

export function BorrowPanel({ bookId, reader, request, now }: BorrowPanelProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  if (reader === "anonymous") {
    return (
      <p>
        <Link href="/auth/signin" className="font-medium underline underline-offset-4">
          Inicia sesión
        </Link>{" "}
        para solicitarlo.
      </p>
    );
  }
  if (reader === "unverified") {
    return (
      <p>
        <Link href="/auth/verify-email" className="font-medium underline underline-offset-4">
          Verifica tu correo
        </Link>{" "}
        para solicitarlo.
      </p>
    );
  }
  if (request?.status === "approved") {
    return (
      <p className="inline-flex items-center gap-2 font-medium">
        <Check aria-hidden className="size-4" />
        Lo tienes prestado{request.dueDate ? dueSuffix(request.dueDate, now) : ""}.
      </p>
    );
  }
  if (request?.status === "pending") {
    return (
      <p>
        <span className="inline-flex items-center gap-2 font-medium">
          <Check aria-hidden className="size-4" />
          Solicitud enviada.
        </span>{" "}
        <span className="text-muted-foreground">Un bibliotecario la revisará. </span>
        <Link href="/profile" className="underline underline-offset-4">
          Ver mis libros
        </Link>
      </p>
    );
  }

  async function send() {
    setSending(true);
    const result = await createBorrowRequest({ bookId, note });
    setSending(false);
    if (isErr(result)) {
      toastActionError(result.error);
      router.refresh();
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid justify-items-start gap-3">
      <details className="group w-full">
        <summary className="inline-flex min-h-control list-none items-center text-sm text-muted-foreground underline underline-offset-4 group-open:hidden">
          Añadir una nota
        </summary>
        <Textarea
          aria-label="Nota para el bibliotecario"
          placeholder="Por ejemplo, el volumen que necesitas"
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </details>
      <Button variant="primary" disabled={sending} onClick={send}>
        {sending ? "Enviando…" : "Solicitar préstamo"}
      </Button>
    </div>
  );
}
