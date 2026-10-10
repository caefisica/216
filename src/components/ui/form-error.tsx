import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

export function FormError({ message, className }: { message?: string | null; className?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive",
        className,
      )}
    >
      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}
