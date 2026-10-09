"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast, toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import { returnLoan } from "../actions";
import { DESK_LIST_ID } from "../constants";

/** A return is final, so it asks once before it frees the copy. */
export function ReturnButton({
  requestId,
  title,
  reader,
  copyCode,
}: {
  requestId: string;
  title: string;
  reader: string;
  copyCode: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    const result = await returnLoan({ requestId });
    if (isErr(result)) {
      toastActionError(result.error);
    } else {
      toast({ title: "Devolución registrada" });
      document.getElementById(DESK_LIST_ID)?.focus();
    }
    setOpen(false);
    router.refresh();
    setBusy(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full border-input sm:w-auto"
          aria-label={`Devolver ${title} a nombre de ${reader}`}
        >
          <Undo2 /> Devolver
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Registrar la devolución?</AlertDialogTitle>
          <AlertDialogDescription>
            {copyCode} · {title}. El ejemplar vuelve a estar disponible y la devolución no se puede
            deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(event) => {
              event.preventDefault();
              void confirm();
            }}
          >
            Registrar devolución
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
