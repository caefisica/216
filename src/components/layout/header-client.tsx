"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/features/auth/actions/session";
import type { AuthUser } from "@/features/auth/core/session";
import { cn } from "@/lib/utils";

interface HeaderClientProps {
  user: AuthUser | null;
  /** A librarian or admin with a verified email. */
  staff: boolean;
  /** Requests waiting for a librarian. Zero for readers. */
  pending: number;
}

const link =
  "inline-flex h-control items-center gap-2 rounded-md px-2 text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground sm:px-3 aria-[current=page]:text-foreground aria-[current=page]:underline aria-[current=page]:decoration-2 aria-[current=page]:decoration-accent aria-[current=page]:underline-offset-8";

export function HeaderClient({ user, staff, pending }: HeaderClientProps) {
  const pathname = usePathname() ?? "";

  const items = [
    {
      href: "/",
      label: "Catálogo",
      active: pathname === "/" || pathname.startsWith("/books"),
      // Staff have four more destinations and the logo already leads here.
      hideOnPhone: staff,
    },
    ...(staff
      ? [
          {
            href: "/admin/loans",
            label: "Préstamos",
            active: pathname.startsWith("/admin/loans"),
            count: pending,
          },
          {
            href: "/admin/books/create",
            label: "Registrar",
            active: pathname.startsWith("/admin/books"),
          },
          {
            href: "/admin/settings",
            label: "Ajustes",
            active: pathname.startsWith("/admin/settings"),
          },
        ]
      : []),
    // Staff reach their account here too, where the name is changed.
    ...(user
      ? [{ href: "/profile", label: "Mis libros", active: pathname.startsWith("/profile") }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div
        className={cn(
          "mx-auto flex max-w-page items-center gap-1 px-4 py-2 sm:gap-4 sm:px-6",
          staff && "max-sm:flex-wrap",
        )}
      >
        <Link
          href="/"
          className="-ml-2 inline-flex min-h-control items-center rounded-md px-2 text-xl font-semibold leading-none"
          aria-label="216, inicio"
        >
          216
        </Link>
        <nav
          aria-label="Principal"
          // Staff have five destinations, which do not fit beside the logo on a phone.
          className={cn(
            "-mx-1 flex min-w-0 flex-1 items-center overflow-x-auto",
            staff && "max-sm:order-last max-sm:basis-full",
          )}
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(link, "hideOnPhone" in item && item.hideOnPhone && "max-sm:hidden")}
            >
              {item.label}
              {"count" in item && item.count !== undefined && item.count > 0 && (
                <span className="rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground tabular-nums">
                  <span className="sr-only">, </span>
                  {item.count}
                  <span className="sr-only"> pendientes</span>
                </span>
              )}
            </Link>
          ))}
        </nav>
        {user ? (
          <form action={signOutAction} className="ml-auto">
            <button type="submit" className={link}>
              Salir
            </button>
          </form>
        ) : (
          <Link href="/auth/signin" className={cn(link, "ml-auto")}>
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}
