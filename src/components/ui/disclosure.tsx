import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface DisclosureProps {
  title: string;
  /** A number or short note after the title. */
  detail?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** Detail few readers need, one click away. The summary is a 36px target, 44px on touch screens. */
export function Disclosure({ title, detail, className, children }: DisclosureProps) {
  return (
    <details className={cn("group", className)}>
      <summary className="-ml-1 inline-flex min-h-control list-none items-center gap-1.5 rounded-sm pr-2 pl-1 text-md font-semibold transition-colors duration-100 hover:bg-sunken [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden
          className="size-4 text-muted-foreground transition-transform duration-150 ease-out group-open:rotate-90"
        />
        {title}
        {detail !== undefined && (
          <span className="font-normal text-muted-foreground tabular-nums">{detail}</span>
        )}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
