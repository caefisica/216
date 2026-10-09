"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";

const linkClass = "text-sm text-muted-foreground transition-colors hover:text-primary";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container mx-auto px-3 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <Link href="/" className="group mb-4 flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground transition-colors group-hover:bg-primary/90">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold leading-none">216</span>
            </Link>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">Biblioteca</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className={linkClass}>
                  Explorar libros
                </Link>
              </li>
              <li>
                <Link href="/donors" className={linkClass}>
                  Principales donantes
                </Link>
              </li>
              <li>
                <Link href="/about/rules" className={linkClass}>
                  Normas de la biblioteca
                </Link>
              </li>
              <li>
                <Link href="/favorites" className={linkClass}>
                  Mis favoritos
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">Nosotros</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className={linkClass}>
                  Nuestra misión
                </Link>
              </li>
              <li>
                <Link href="/about/team" className={linkClass}>
                  Nuestro equipo
                </Link>
              </li>
              <li>
                <Link href="/about/location" className={linkClass}>
                  Visítanos
                </Link>
              </li>
              <li>
                <Link href="/about/rules" className={linkClass}>
                  Políticas
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
