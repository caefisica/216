import { cn } from "@/lib/utils";

interface EmptyProps {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function Empty({ title, children, action, className }: EmptyProps) {
  return (
    <div className={cn("grid justify-items-start gap-4 py-12", className)}>
      <div className="grid gap-1.5">
        <p className="font-serif text-xl font-medium">{title}</p>
        {children && <p className="max-w-measure text-pretty text-muted-foreground">{children}</p>}
      </div>
      {action}
    </div>
  );
}
