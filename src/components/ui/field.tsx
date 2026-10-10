import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const control =
  "w-full rounded-md border border-input bg-surface px-3 text-base text-foreground placeholder:text-muted-foreground disabled:opacity-50 sm:text-sm";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(control, "h-control", className)} {...props} />
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
        className={cn(control, "h-control appearance-none pr-8", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
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
    <label className={cn("grid content-start gap-1", className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && !error && <span className="text-xs text-muted-foreground">{hint}</span>}
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </label>
  );
}

export { Field, Input, Select, Textarea };
