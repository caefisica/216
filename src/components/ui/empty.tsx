import { cn } from "@/lib/utils";

interface EmptyProps {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  /** `h1` when the state is the whole page, such as an error or a missing page. */
  as?: "p" | "h1";
  className?: string;
}

export function Empty({ title, children, action, as: Title = "p", className }: EmptyProps) {
  return (
    <div className={cn("grid justify-items-start gap-4 py-12", className)}>
      <div className="grid gap-1.5">
        <Title className="font-serif text-xl font-medium">{title}</Title>
        {children && <p className="max-w-measure text-pretty text-muted-foreground">{children}</p>}
      </div>
      {action}
    </div>
  );
}
