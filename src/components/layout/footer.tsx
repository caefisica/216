import Link from "next/link";

const link = "inline-flex min-h-control items-center rounded-md hover:text-foreground";

export function Footer() {
  return (
    <footer className="mt-12 border-t">
      <nav
        aria-label="Información"
        className="mx-auto flex max-w-wide flex-wrap items-center gap-x-4 px-4 py-3 text-sm text-muted-foreground"
      >
        <span>Biblioteca 216</span>
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
