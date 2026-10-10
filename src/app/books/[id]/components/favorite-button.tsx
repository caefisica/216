"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setHeart } from "@/features/books/actions";
import { toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";

/** Update the icon optimistically, then restore it if the server rejects the change. */
export function FavoriteButton({
  bookId,
  saved,
  className,
}: {
  bookId: string;
  saved: boolean;
  className?: string;
}) {
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
    <Button variant="quiet" aria-pressed={hearted} onClick={toggle} className={className}>
      <Heart aria-hidden className={hearted ? "fill-current" : undefined} />
      {hearted ? "Guardado" : "Guardar"}
    </Button>
  );
}
