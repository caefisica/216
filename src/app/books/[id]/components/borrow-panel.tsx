"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clock } from "lucide-react";
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

const inlineLink =
  "font-medium text-accent underline decoration-accent/40 underline-offset-[3px] transition-colors duration-100 hover:decoration-accent";

export function BorrowPanel({ bookId, reader, request, now }: BorrowPanelProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [noting, setNoting] = useState(false);
  const [sending, setSending] = useState(false);

  if (reader === "anonymous") {
    return (
      <p>
        <Link href="/auth/signin" className={inlineLink}>
          Inicia sesión
        </Link>{" "}
        para solicitarlo.
      </p>
    );
  }
  if (reader === "unverified") {
    return (
      <p>
        <Link href="/auth/verify-email" className={inlineLink}>
          Verifica tu correo
        </Link>{" "}
        para solicitarlo.
      </p>
    );
  }
  if (request?.status === "approved") {
    return (
      <p className="flex items-start gap-2 font-medium">
        <Check aria-hidden className="mt-1 size-4 shrink-0 text-success" />
        Lo tienes prestado{request.dueDate ? dueSuffix(request.dueDate, now) : ""}.
      </p>
    );
  }
  if (request?.status === "pending") {
    return (
      <div className="flex items-start gap-2">
        <Clock aria-hidden className="mt-1 size-4 shrink-0 text-muted-foreground" />
        <p>
          <span className="font-medium">Solicitud enviada.</span>{" "}
          <span className="text-muted-foreground">Un bibliotecario la revisará. </span>
          <Link href="/profile" className={inlineLink}>
            Ver mis libros
          </Link>
        </p>
      </div>
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
    <div className="grid gap-3">
      {noting && (
        <Textarea
          autoFocus
          aria-label="Nota para el bibliotecario"
          placeholder="Por ejemplo, el volumen que necesitas"
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Button
          variant="primary"
          disabled={sending}
          aria-busy={sending}
          onClick={send}
          className="max-sm:w-full"
        >
          {sending ? "Enviando…" : "Solicitar préstamo"}
        </Button>
        {!noting && (
          <button
            type="button"
            onClick={() => setNoting(true)}
            className="inline-flex min-h-control items-center rounded-xs text-sm text-muted-foreground underline decoration-border underline-offset-4 transition-colors duration-100 hover:text-foreground hover:decoration-current"
          >
            Añadir una nota
          </button>
        )}
      </div>
    </div>
  );
}
