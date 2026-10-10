import { Check, Clock, Minus } from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface AvailabilityProps {
  lendable: number;
  total: number;
  className?: string;
}

/** Keep the title's state in text as well as the icon and colour. */
export function Availability({ lendable, total, className }: AvailabilityProps) {
  if (total === 0) {
    return (
      <Badge tone="neutral" className={className}>
        <Minus aria-hidden />
        Sin ejemplares
      </Badge>
    );
  }
  if (lendable === 0) {
    return (
      <Badge tone="warning" className={className}>
        <Clock aria-hidden />
        No disponible
      </Badge>
    );
  }
  return (
    <Badge tone="success" className={className}>
      <Check aria-hidden />
      {total === 1 ? "Disponible" : `${lendable} de ${total} disponibles`}
    </Badge>
  );
}
