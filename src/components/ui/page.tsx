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
      className={cn("mx-auto w-full px-4 py-6 sm:px-6 sm:py-10", widths[width], className)}
      {...props}
    />
  );
}
