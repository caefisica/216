import * as React from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

// Text is 16px at every width, because iOS Safari zooms into a field whose text is smaller.
const control =
  "w-full rounded-md border border-input bg-surface px-3 text-base text-foreground transition-[border-color] placeholder:text-muted-foreground hover:border-muted-foreground disabled:opacity-50 aria-invalid:border-destructive";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(control, "h-field", className)} {...props} />
  ),
);
Input.displayName = "Input";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(control, "min-h-24 py-2", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, children, ...props }, ref) => (
    <div className="relative max-w-full">
      <select
        ref={ref}
        className={cn(control, "h-field cursor-pointer appearance-none truncate pr-10", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  ),
);
Select.displayName = "Select";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

/** The wrapping label associates the control without requiring an id. */
function Field({ label, hint, error, className, children }: FieldProps) {
  return (
    <label className={cn("grid content-start gap-2", className)}>
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {hint && !error && <span className="text-sm text-muted-foreground">{hint}</span>}
      {error && (
        <span role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error}
        </span>
      )}
    </label>
  );
}

export { Field, Input, Select, Textarea };
