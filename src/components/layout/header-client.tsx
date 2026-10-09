"use client";

import Link from "next/link";
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
  return (
    <header className="border-b bg-white/95 backdrop-blur-sm supports-backdrop-filter:bg-white/60 sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold leading-none">216</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/"
                      className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-active:bg-accent/50 data-[state=open]:bg-accent/50"
                    >
                      {user && (user.role === "librarian" || user.role === "admin")
                        ? "Panel de gestión"
                        : "Explorar libros"}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                {user && (user.role === "librarian" || user.role === "admin") && (
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/admin/loans"
                        className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-active:bg-accent/50 data-[state=open]:bg-accent/50"
                      >
                        Préstamos
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
                            className="flex h-full w-full select-none flex-col justify-end rounded-md bg-linear-to-b from-blue-500 to-blue-600 p-6 no-underline outline-hidden focus:shadow-md"
                            href="/about"
                          >
                            <BookOpen className="h-6 w-6 text-white" />
                            <div className="mb-2 mt-4 text-lg font-medium text-white">
                              Acerca de la biblioteca
                            </div>
                            <p className="text-sm leading-tight text-blue-100">
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
                      className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-active:bg-accent/50 data-[state=open]:bg-accent/50"
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
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-3 w-3 text-blue-600" />
                    </div>
                    <span className="hidden sm:inline font-medium">{user.name}</span>
                    {(user.role === "librarian" || user.role === "admin") && (
                      <span className="hidden sm:inline text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {user.role === "admin" ? "Admin" : "Bibliotecario"}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm font-medium">{user.name}</div>
                  <div className="px-2 py-1.5 text-xs text-gray-500">{user.email}</div>
                  <DropdownMenuSeparator />
                  {(user.role === "librarian" || user.role === "admin") && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/loans" className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Préstamos
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
                      <button type="submit" className="flex items-center text-red-600 w-full">
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
      </div>
    </header>
  );
}
