"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/features/auth/actions/session";
import { Button } from "@/components/ui/button";
import { BookOpen, User, LogOut, Heart } from "lucide-react";
import type { AuthUser } from "@/features/auth/core/session";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

interface ListItemProps extends React.ComponentPropsWithoutRef<"a"> {
  title: string;
}

const ListItem = ({ className, title, children, href, ...props }: ListItemProps) => (
  <li>
    <NavigationMenuLink asChild>
      <Link
        href={href!}
        className={cn(
          "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
          className,
        )}
        {...props}
      >
        <div className="text-sm font-medium leading-none">{title}</div>
        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">{children}</p>
      </Link>
    </NavigationMenuLink>
  </li>
);

interface HeaderClientProps {
  user: AuthUser | null;
}

export function HeaderClient({ user }: HeaderClientProps) {
  const pathname = usePathname() ?? "";
  const staff = user?.role === "librarian" || user?.role === "admin";
  const navClass = (active: boolean) =>
    cn(
      "group inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-hidden",
      active ? "bg-accent text-accent-foreground" : "bg-background",
    );
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="container mx-auto px-3 sm:px-6">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold leading-none tracking-tight">216</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/"
                      className={navClass(pathname === "/")}
                      aria-current={pathname === "/" ? "page" : undefined}
                    >
                      {user && (user.role === "librarian" || user.role === "admin")
                        ? "Panel de gestión"
                        : "Explorar libros"}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                {staff && (
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/admin/loans"
                        className={navClass(pathname.startsWith("/admin/loans"))}
                        aria-current={pathname.startsWith("/admin/loans") ? "page" : undefined}
                      >
                        Préstamos
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}

                {staff && (
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/admin/books/create"
                        className={navClass(pathname.startsWith("/admin/books"))}
                        aria-current={pathname.startsWith("/admin/books") ? "page" : undefined}
                      >
                        Registrar libro
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}

                <NavigationMenuItem>
                  <NavigationMenuTrigger className="h-9">Nosotros</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid gap-3 p-6 w-[400px]">
                      <li className="row-span-3">
                        <NavigationMenuLink asChild>
                          <Link
                            className="flex h-full w-full select-none flex-col justify-end rounded-md bg-primary p-6 no-underline outline-hidden focus:shadow-md"
                            href="/about"
                          >
                            <BookOpen className="h-6 w-6 text-primary-foreground" />
                            <div className="mb-2 mt-4 text-lg font-medium text-primary-foreground">
                              Acerca de la biblioteca
                            </div>
                            <p className="text-sm leading-tight text-primary-foreground/75">
                              Conoce nuestra misión, historia y compromiso con la educación en
                              física
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <ListItem href="/about/team" title="Nuestro equipo">
                        Conoce a los bibliotecarios y personal que hacen todo esto posible
                      </ListItem>
                      <ListItem href="/about/location" title="Visítanos">
                        Cómo llegar y los horarios de atención para nuestra ubicación física.
                      </ListItem>
                      <ListItem href="/about/rules" title="Reglas">
                        Políticas de préstamo, límites y pautas para miembros
                      </ListItem>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/donors"
                      className={navClass(pathname.startsWith("/donors"))}
                      aria-current={pathname.startsWith("/donors") ? "page" : undefined}
                    >
                      Donantes
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="flex items-center space-x-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2 h-9">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent">
                      <User className="h-3 w-3 text-accent-foreground" />
                    </div>
                    <span className="hidden sm:inline font-medium">{user.name}</span>
                    {(user.role === "librarian" || user.role === "admin") && (
                      <span className="hidden rounded-full bg-accent px-2 py-1 text-xs text-accent-foreground sm:inline">
                        {user.role === "admin" ? "Admin" : "Bibliotecario"}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm font-medium">{user.name}</div>
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">{user.email}</div>
                  <DropdownMenuSeparator />
                  {(user.role === "librarian" || user.role === "admin") && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/loans" className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Préstamos
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {staff && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/books/create" className="flex items-center">
                        <BookOpen className="mr-2 h-4 w-4" />
                        Registrar libro
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/favorites" className="flex items-center">
                      <Heart className="h-4 w-4 mr-2" />
                      Mis favoritos
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <form action={signOutAction}>
                      <button type="submit" className="flex w-full items-center text-destructive">
                        <LogOut className="h-4 w-4 mr-2" />
                        Cerrar sesión
                      </button>
                    </form>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/auth/signin">Iniciar sesión</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/auth/signup">Registrarse</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
        {staff && (
          <nav
            aria-label="Administración"
            className="flex gap-1 overflow-x-auto border-t border-border py-2 md:hidden"
          >
            {[
              { href: "/", label: "Catálogo", active: pathname === "/" },
              {
                href: "/admin/loans",
                label: "Préstamos",
                active: pathname.startsWith("/admin/loans"),
              },
              {
                href: "/admin/books/create",
                label: "Registrar libro",
                active: pathname.startsWith("/admin/books"),
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={cn(navClass(item.active), "shrink-0 px-3")}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
