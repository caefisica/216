import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-control shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-base font-semibold transition-[color,background-color,border-color,scale] active:scale-97 has-[>svg:first-child]:pl-3 has-[>svg:last-child]:pr-3 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary:
          "border border-input bg-background text-foreground hover:bg-sunken active:bg-pressed",
        quiet: "text-foreground hover:bg-sunken active:bg-pressed",
        danger:
          "border border-destructive bg-background text-destructive hover:bg-destructive-soft",
      },
      shape: {
        text: "",
        icon: "min-w-control px-0 has-[>svg:first-child]:pl-0 has-[>svg:last-child]:pr-0",
      },
    },
    defaultVariants: {
      variant: "secondary",
      shape: "text",
    },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, shape, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, shape }), className)} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
