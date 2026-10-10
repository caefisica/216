import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

// iOS Safari zooms into a field whose text is under 16px, so touch screens get 1rem.
const control =
  "w-full rounded-sm border border-input bg-surface px-3 text-base text-foreground shadow-[inset_0_1px_2px_rgb(0_0_0/0.04)] transition-[border-color] duration-100 ease-out placeholder:text-muted-foreground hover:border-muted-foreground disabled:opacity-50 aria-invalid:border-destructive pointer-coarse:text-[1rem]";

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
        className={cn(control, "h-control cursor-pointer appearance-none truncate pr-9", className)}
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
    <label className={cn("grid content-start gap-1.5", className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && !error && <span className="text-sm text-muted-foreground">{hint}</span>}
      {error && (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      )}
    </label>
  );
}

export { Field, Input, Select, Textarea };
