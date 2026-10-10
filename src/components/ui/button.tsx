import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-control shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-sm px-3.5 text-sm font-medium transition-[color,background-color,border-color,box-shadow] duration-100 ease-out has-[>svg:first-child]:pl-3 has-[>svg:last-child]:pr-3 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-[0_1px_2px_rgb(0_0_0/0.12)] hover:bg-primary/88 active:bg-primary/80",
        secondary:
          "border bg-surface text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.04)] hover:border-input/70 hover:bg-sunken active:bg-sunken",
        quiet: "text-foreground hover:bg-sunken active:bg-border/60",
        danger:
          "border border-destructive/40 bg-surface text-destructive hover:border-destructive/70 hover:bg-destructive-soft",
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
