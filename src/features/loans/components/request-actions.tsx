"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { toast } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import { locationLabel } from "@/features/books/labels";
import { approveRequest, rejectRequest } from "../actions";
import { RejectionReasonSchema } from "../schemas";
import type { LendableCopy } from "../types";
import { resumeDesk } from "./resume-desk";

const copyOption = (copy: LendableCopy) =>
  [
    copy.code,
    copy.volume ? `vol. ${copy.volume}` : null,
    copy.location ? locationLabel(copy.location) : "sin ubicación",
  ]
    .filter(Boolean)
    .join(" · ");

/** The librarian is shown which copy to fetch. The lowest-numbered one is already chosen. */
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
  const reasonInput = useRef<HTMLInputElement>(null);
  const rejectButton = useRef<HTMLButtonElement>(null);
  const [copyId, setCopyId] = useState(copies[0]?.id ?? "");
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = copies.find((copy) => copy.id === copyId) ?? copies[0];

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
      toast({ title: done, description: title });
      resumeDesk();
    }
    router.refresh();
    setBusy(false);
  };

  const approve = async () => {
    if (busy || !chosen) return;
    setBusy(true);
    setError(null);
    finish(await approveRequest({ requestId, copyId: chosen.id }), `Aprobado: ${chosen.code}`);
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

  const message = error && (
    <p role="alert" className="text-sm text-destructive">
      {error}
    </p>
  );

  if (rejecting) {
    return (
      <form onSubmit={reject} className="grid gap-3 sm:w-80">
        <Field label="Motivo" hint="Lo ve el lector." error={error ?? undefined}>
          <Input
            ref={reasonInput}
            name="reason"
            maxLength={300}
            autoComplete="off"
            aria-invalid={error !== null}
            onKeyDown={(event) => event.key === "Escape" && closeReject()}
          />
        </Field>
        <div className="flex gap-2">
          <Button type="submit" variant="danger" disabled={busy}>
            Rechazar
          </Button>
          <Button type="button" variant="quiet" onClick={closeReject}>
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="grid gap-2 sm:w-80">
      {!chosen ? (
        <div className="grid justify-items-start gap-1.5">
          <Badge tone="warning">
            <Clock aria-hidden />
            Sin ejemplares libres
          </Badge>
          <p className="text-sm text-muted-foreground">Espera una devolución.</p>
        </div>
      ) : copies.length > 1 ? (
        <Select
          aria-label={`Ejemplar para ${reader}`}
          value={copyId}
          onChange={(event) => setCopyId(event.target.value)}
        >
          {copies.map((copy) => (
            <option key={copy.id} value={copy.id}>
              {copyOption(copy)}
            </option>
          ))}
        </Select>
      ) : (
        <p className="text-sm text-muted-foreground">{copyOption(chosen)}</p>
      )}
      {message}
      <div className="flex gap-2">
        {chosen && (
          <Button
            type="button"
            variant="primary"
            data-primary
            disabled={busy}
            aria-label={`Aprobar ${title} para ${reader}`}
            onClick={approve}
          >
            Aprobar
          </Button>
        )}
        <Button
          ref={rejectButton}
          type="button"
          variant="quiet"
          disabled={busy}
          aria-label={`Rechazar ${title} de ${reader}`}
          onClick={() => setRejecting(true)}
        >
          Rechazar
        </Button>
      </div>
    </div>
  );
}
