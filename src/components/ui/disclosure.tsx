import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface DisclosureProps {
  title: string;
  /** A number or short note after the title. */
  detail?: React.ReactNode;
  open?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Detail few readers need, one click away. The summary is a 40px target, 44px on touch screens. */
export function Disclosure({ title, detail, open, className, children }: DisclosureProps) {
  return (
    <details open={open} className={cn("group", className)}>
      <summary className="-ml-2 inline-flex max-w-full min-h-control list-none items-center gap-2 rounded-md pr-3 pl-2 text-base font-semibold transition-colors hover:bg-sunken [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
        />
        <span className="min-w-0 text-balance">{title}</span>
        {detail !== undefined && (
          <span className="shrink-0 font-normal text-muted-foreground tabular-nums">{detail}</span>
        )}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
