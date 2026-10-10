import { cn } from "@/lib/utils";

/** A keycap. Hidden on touch screens, where there is no keyboard to hint at. */
export function Kbd({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        "hidden h-5 min-w-5 items-center justify-center rounded-xs border bg-raised px-1 font-mono text-xs text-muted-foreground shadow-[0_1px_0_var(--border)] pointer-fine:inline-flex",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
