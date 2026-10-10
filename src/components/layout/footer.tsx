import Link from "next/link";

const link =
  "inline-flex min-h-control items-center rounded-sm transition-colors duration-100 hover:text-foreground";

export function Footer() {
  return (
    <footer className="mt-16 border-t">
      <nav
        aria-label="Información"
        className="mx-auto flex max-w-page flex-wrap items-center gap-x-5 px-4 py-4 text-sm text-muted-foreground sm:px-6"
      >
        <span className="font-serif text-base text-foreground">Biblioteca 216</span>
        <Link href="/about" className={link}>
          Acerca de
        </Link>
        <Link href="/donors" className={link}>
          Donantes
        </Link>
        <Link href="/privacy" className={link}>
          Privacidad
        </Link>
        <Link href="/terms" className={link}>
          Términos
        </Link>
      </nav>
    </footer>
  );
}
