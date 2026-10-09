"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import { locationLabel } from "@/features/books/labels";
import { approveRequest, rejectRequest } from "../actions";
import { DESK_LIST_ID } from "../constants";
import { RejectionReasonSchema } from "../schemas";
import type { LendableCopy } from "../types";

const copyOption = (copy: LendableCopy) =>
  [
    copy.code,
    copy.volume ? `vol. ${copy.volume}` : null,
    copy.location ? locationLabel(copy.location) : "sin ubicación",
  ]
    .filter(Boolean)
    .join(" · ");

/** The copy field starts on the lowest-numbered lendable copy, so Enter approves without touching it. */
export function RequestActions({
  requestId,
  title,
  reader,
  copies,
}: {
  requestId: string;
  title: string;
  reader: string;
  copies: LendableCopy[];
}) {
  const router = useRouter();
  const copyId = useId();
  const reasonId = useId();
  const errorId = useId();
  const rejectButton = useRef<HTMLButtonElement>(null);
  const reasonInput = useRef<HTMLInputElement>(null);
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rejecting) reasonInput.current?.focus();
  }, [rejecting]);

  const closeReject = () => {
    setRejecting(false);
    setError(null);
    requestAnimationFrame(() => rejectButton.current?.focus());
  };

  const finish = (result: Awaited<ReturnType<typeof approveRequest>>, done: string) => {
    if (isErr(result)) {
      setError(result.error.message);
    } else {
      toast({ title: done });
      document.getElementById(DESK_LIST_ID)?.focus();
    }
    router.refresh();
    setBusy(false);
  };

  const approve = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const chosen = new FormData(event.currentTarget).get("copy");
    if (busy || typeof chosen !== "string") return;
    setBusy(true);
    setError(null);
    finish(await approveRequest({ requestId, copyId: chosen }), "Solicitud aprobada");
  };

  const reject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const reason = RejectionReasonSchema.safeParse(new FormData(event.currentTarget).get("reason"));
    if (!reason.success) {
      setError(reason.error.issues[0].message);
      reasonInput.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    finish(await rejectRequest({ requestId, reason: reason.data }), "Solicitud rechazada");
  };

  const confirmOnEnter = (event: KeyboardEvent<HTMLSelectElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const message = error && (
    <p id={errorId} role="alert" className="text-sm font-medium text-destructive">
      {error}
    </p>
  );

  if (rejecting) {
    return (
      <form onSubmit={reject} className="flex flex-col gap-2">
        <label htmlFor={reasonId} className="text-sm font-medium text-foreground">
          Motivo del rechazo{" "}
          <span className="font-normal text-muted-foreground">(lo ve el lector)</span>
        </label>
        <Input
          id={reasonId}
          ref={reasonInput}
          name="reason"
          maxLength={300}
          autoComplete="off"
          className="border-input"
          aria-describedby={error ? errorId : undefined}
          onKeyDown={(event) => event.key === "Escape" && closeReject()}
        />
        {message}
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="destructive"
            className="h-11 flex-1 sm:flex-none"
            disabled={busy}
          >
            <X /> Confirmar rechazo
          </Button>
          <Button type="button" variant="outline" className="h-11" onClick={closeReject}>
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form
      key={copies.map((copy) => copy.id).join()}
      onSubmit={approve}
      className="flex flex-col gap-2"
    >
      {copies.length === 0 ? (
        <p className="text-sm text-foreground">
          Ningún ejemplar disponible. Rechaza la solicitud o espera una devolución.
        </p>
      ) : (
        <>
          <label htmlFor={copyId} className="sr-only">
            Ejemplar para {title} a nombre de {reader}
          </label>
          <select
            id={copyId}
            name="copy"
            defaultValue={copies[0].id}
            onKeyDown={confirmOnEnter}
            aria-describedby={error ? errorId : undefined}
            className="h-11 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {copies.map((copy) => (
              <option key={copy.id} value={copy.id}>
                {copyOption(copy)}
              </option>
            ))}
          </select>
        </>
      )}
      {message}
      <div className="flex gap-2">
        {copies.length > 0 && (
          <Button
            type="submit"
            className="h-11 flex-1 sm:flex-none"
            disabled={busy}
            aria-label={`Aprobar ${title} a nombre de ${reader}`}
          >
            <Check /> Aprobar
          </Button>
        )}
        <Button
          ref={rejectButton}
          type="button"
          variant="outline"
          className="h-11 flex-1 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive sm:flex-none"
          disabled={busy}
          aria-label={`Rechazar ${title} a nombre de ${reader}`}
          onClick={() => setRejecting(true)}
        >
          <X /> Rechazar
        </Button>
      </div>
    </form>
  );
}
