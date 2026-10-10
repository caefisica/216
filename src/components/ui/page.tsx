import { cn } from "@/lib/utils";

const widths = {
  prose: "max-w-prose",
  page: "max-w-page",
  wide: "max-w-wide",
} as const;

interface PageProps extends React.ComponentProps<"div"> {
  width?: keyof typeof widths;
}

export function Page({ width = "page", className, ...props }: PageProps) {
  return (
    <div className={cn("mx-auto w-full px-4 py-6 sm:py-8", widths[width], className)} {...props} />
  );
}
