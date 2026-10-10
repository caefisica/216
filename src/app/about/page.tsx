import Link from "next/link";
import { Page } from "@/components/ui/page";
import { getLibraryCounts } from "@/features/readers/repository";

export default async function AboutPage() {
  const { titleCount, copyCount, availableNow } = await getLibraryCounts();

  return (
    <Page width="prose">
      <h1 className="font-serif text-2xl font-semibold">Biblioteca de Física</h1>
      <div className="mt-4 grid gap-4">
        <p>
          La biblioteca del ambiente 216 presta libros de física a estudiantes y docentes de la
          Facultad de Ciencias Físicas. Tiene {titleCount} títulos en {copyCount} ejemplares, y{" "}
          {availableNow} están disponibles hoy.
        </p>
        <p>
          Busca un libro en el{" "}
          <Link href="/" className="text-accent underline underline-offset-2">
            catálogo
          </Link>
          . Si hay un ejemplar disponible, solicítalo con tu cuenta. Cuando el equipo lo aprueba, lo
          ves en Mis libros y lo recoges en el ambiente. Cada préstamo dura 14 días.
        </p>
        <p>
          La colección crece con libros donados. Los nombres de quienes los dieron están en la{" "}
          <Link href="/donors" className="text-accent underline underline-offset-2">
            lista de donantes
          </Link>
          .
        </p>
      </div>
    </Page>
  );
}
