import { cn } from "@/lib/utils";

const widths = {
  prose: "max-w-measure",
  page: "max-w-page",
} as const;

interface PageProps extends React.ComponentProps<"div"> {
  width?: keyof typeof widths;
}

export function Page({ width = "page", className, ...props }: PageProps) {
  return (
    <div
      className={cn("mx-auto w-full px-4 py-8 sm:px-6 sm:py-12", widths[width], className)}
      {...props}
    />
  );
}

export function PageTitle({ className, ...props }: React.ComponentProps<"h1">) {
  return <h1 className={cn("text-2xl font-semibold sm:text-3xl", className)} {...props} />;
}

export function SectionTitle({
  as: Tag = "h2",
  className,
  ...props
}: React.ComponentProps<"h2"> & { as?: "h2" | "h3" }) {
  return <Tag className={cn("text-lg font-semibold", className)} {...props} />;
}
