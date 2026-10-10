"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

const track = "inline-flex h-control items-stretch rounded-md border bg-sunken p-0.5";
const segment =
  "inline-flex items-center gap-1.5 rounded-sm px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-[color,background-color,box-shadow] duration-100 ease-out hover:text-foreground";

interface SegmentedNavProps {
  label: string;
  items: readonly { href: string; label: React.ReactNode; current: boolean }[];
  className?: string;
}

/** Use links when each view has its own URL. `Segmented` controls local state. */
export function SegmentedNav({ label, items, className }: SegmentedNavProps) {
  return (
    <nav aria-label={label} className={cn(track, className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.current ? "page" : undefined}
          className={cn(
            segment,
            "aria-[current=page]:bg-raised aria-[current=page]:text-foreground aria-[current=page]:shadow-raised",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: React.ReactNode }[];
  onChange: (value: T) => void;
  className?: string;
}

/**
 * A row of mutually exclusive choices that filter what is on screen. Native radios give it one tab
 * stop, and the arrow keys move and select.
 */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: SegmentedProps<T>) {
  const name = React.useId();

  return (
    <fieldset className={cn(track, className)}>
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            segment,
            "cursor-pointer has-checked:bg-raised has-checked:text-foreground has-checked:shadow-raised has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent",
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
