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
  "inline-flex h-control items-center gap-1.5 rounded-md px-1 text-sm sm:px-3 font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-foreground aria-[current=page]:underline aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8";

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
        ]
      : []),
    ...(staff
      ? [
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
    <header className="border-b">
      <div className="mx-auto flex max-w-wide items-center gap-1 px-2 py-2 sm:gap-4 sm:px-4">
        <Link
          href="/"
          className="inline-flex min-h-control items-center rounded-md px-1 font-serif text-xl font-semibold leading-none tracking-tight"
          aria-label="216, inicio"
        >
          216
        </Link>
        <nav
          aria-label="Principal"
          className="-mx-1 flex min-w-0 flex-1 items-center overflow-x-auto"
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
                <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                  <span className="sr-only">, </span>
                  {item.count}
                  <span className="sr-only"> pendientes</span>
                </span>
              )}
            </Link>
          ))}
        </nav>
        {user ? (
          <form action={signOutAction}>
            <button type="submit" className={link}>
              Salir
            </button>
          </form>
        ) : (
          <Link href="/auth/signin" className={link}>
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}
