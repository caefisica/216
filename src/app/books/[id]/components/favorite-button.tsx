"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setHeart } from "@/features/books/actions";
import { toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";

/** Flips at once and goes back if the server refuses. */
export function FavoriteButton({ bookId, saved }: { bookId: string; saved: boolean }) {
  const [hearted, setHearted] = useState(saved);

  async function toggle() {
    const next = !hearted;
    setHearted(next);
    const result = await setHeart({ bookId, hearted: next });
    if (isErr(result)) {
      setHearted(!next);
      toastActionError(result.error);
    }
  }

  return (
    <Button variant="quiet" aria-pressed={hearted} onClick={toggle}>
      <Heart aria-hidden className={hearted ? "fill-current" : undefined} />
      {hearted ? "Guardado" : "Guardar"}
    </Button>
  );
}
