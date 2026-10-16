import { cn } from "@/lib/utils";

/** A keycap. Hidden on touch screens, where there is no keyboard to hint at. */
export function Kbd({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        "hidden h-6 min-w-6 items-center justify-center rounded-sm bg-sunken px-1 font-mono text-xs text-muted-foreground pointer-fine:inline-flex",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
