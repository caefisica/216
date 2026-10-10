import type { ComponentPropsWithoutRef } from "react";
import Link from "next/link";

const linkClass = "text-link underline underline-offset-2";

const components = {
  h1: (props: ComponentPropsWithoutRef<"h1">) => (
    <h1 className="font-serif text-2xl font-semibold" {...props} />
  ),
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2 className="mt-4 text-lg font-semibold" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => <p {...props} />,
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul className="grid list-disc gap-1 pl-5" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol className="grid list-decimal gap-1 pl-5" {...props} />
  ),
  a: ({ href = "", children, ...props }: ComponentPropsWithoutRef<"a">) =>
    href.startsWith("/") ? (
      <Link href={href} className={linkClass}>
        {children}
      </Link>
    ) : (
      <a href={href} className={linkClass} {...props}>
        {children}
      </a>
    ),
};

declare global {
  type MDXProvidedComponents = typeof components;
}

export function useMDXComponents(): MDXProvidedComponents {
  return components;
}
