import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// `control` is a spacing token in globals.css, so `h-11` after `h-control` replaces it.
const twMerge = extendTailwindMerge({ extend: { theme: { spacing: ["control"] } } });

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
