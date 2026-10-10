"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import { toast, toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import { reopenLoan, returnLoan } from "../actions";
import { resumeDesk } from "./resume-desk";

const UNDO_MS = 8000;

/**
 * A return happens on one press. A confirmation would slow every return to guard against a rare
 * slip, so the toast offers an undo instead.
 */
export function ReturnButton({
  requestId,
  title,
  reader,
}: {
  requestId: string;
  title: string;
  reader: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const undo = async () => {
    const result = await reopenLoan({ requestId });
    if (isErr(result)) toastActionError(result.error);
    else toast({ title: "Devolución deshecha", description: title });
    router.refresh();
  };

  const giveBack = async () => {
    setBusy(true);
    const result = await returnLoan({ requestId });
    if (isErr(result)) {
      toastActionError(result.error);
    } else {
      toast({
        title: "Devuelto",
        description: title,
        duration: UNDO_MS,
        action: (
          <ToastAction altText={`Deshacer la devolución de ${title}`} onClick={undo}>
            Deshacer
          </ToastAction>
        ),
      });
      resumeDesk();
    }
    router.refresh();
    setBusy(false);
  };

  return (
    <Button
      type="button"
      data-primary
      disabled={busy}
      aria-label={`Devolver ${title} de ${reader}`}
      onClick={giveBack}
    >
      Devolver
    </Button>
  );
}
