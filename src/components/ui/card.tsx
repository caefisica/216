import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-md bg-surface shadow-raised", className)} {...props} />;
}

export function CardList({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn("divide-y overflow-hidden rounded-md bg-surface shadow-raised", className)}
      {...props}
    />
  );
}

export function CardRow({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      className={cn(
        "relative px-4 py-4 transition-colors sm:px-6 has-[a[data-row-link]]:hover:bg-sunken",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The main link stretches over the row while keeping its own accessible name.
 * Its focus ring outlines the row.
 */
export const rowLink = {
  "data-row-link": "",
  className:
    "after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent",
} as const;
