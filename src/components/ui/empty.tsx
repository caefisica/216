import { cn } from "@/lib/utils";

interface EmptyProps {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function Empty({ title, children, action, className }: EmptyProps) {
  return (
    <div className={cn("grid justify-items-start gap-3 py-12", className)}>
      <div className="grid gap-1">
        <p className="text-lg font-medium">{title}</p>
        {children && <p className="max-w-prose text-muted-foreground">{children}</p>}
      </div>
      {action}
    </div>
  );
}
