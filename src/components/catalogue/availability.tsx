import { Check, Clock, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

interface AvailabilityProps {
  lendable: number;
  total: number;
  className?: string;
}

/** Use both an icon and text so colour is not the only state cue. */
export function Availability({ lendable, total, className }: AvailabilityProps) {
  const state =
    total === 0
      ? { Icon: Minus, text: "Sin ejemplares", tone: "text-muted-foreground" }
      : lendable === 0
        ? { Icon: Clock, text: "No disponible", tone: "text-warning" }
        : {
            Icon: Check,
            text: total === 1 ? "Disponible" : `${lendable} de ${total} disponibles`,
            tone: "text-success",
          };

  return (
    <span
      className={cn("inline-flex items-center gap-1 text-sm font-medium", state.tone, className)}
    >
      <state.Icon aria-hidden className="size-4 shrink-0" />
      {state.text}
    </span>
  );
}
