import { BookOpen, Heart, LibraryBig } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLibraryCounts } from "@/features/readers/repository";

export default async function AboutPage() {
  const counts = await getLibraryCounts();

  return (
    <div className="bg-gray-50/50">
      <section className="border-b bg-white">
        <div className="container mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">216</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-gray-950 sm:text-5xl">
            Una colección de física para aprender, investigar y compartir
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
            La Biblioteca de Física acerca títulos y ejemplares a la comunidad de la Facultad de
            Ciencias Físicas. Explora el catálogo, guarda tus favoritos y solicita un préstamo.
          </p>
        </div>
      </section>

      <main className="container mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <Card className="border-gray-200 shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-950">
                <Heart aria-hidden="true" className="h-5 w-5 text-blue-700" />
                Nuestra misión
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-gray-700 sm:text-base">
              <p>
                Mantenemos una colección útil y accesible para quienes estudian y enseñan física. El
                catálogo describe cada título y cada ejemplar, incluida su ubicación y su
                disponibilidad actual.
              </p>
              <p>
                La biblioteca crece con el trabajo de sus estudiantes, docentes y donantes. Si no
                encuentras un título, puedes consultar con el equipo en el ambiente 216.
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-950">
                <LibraryBig aria-hidden="true" className="h-5 w-5 text-blue-700" />
                Cómo usar la biblioteca
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 text-sm text-gray-700 sm:grid-cols-3">
              <div>
                <p className="font-semibold text-gray-950">Busca</p>
                <p className="mt-1 leading-6">Encuentra un título por nombre, autor o código.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-950">Guarda</p>
                <p className="mt-1 leading-6">Marca favoritos para volver a ellos más tarde.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-950">Solicita</p>
                <p className="mt-1 leading-6">
                  Pide un préstamo cuando haya un ejemplar disponible.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside aria-labelledby="collection-title">
          <Card className="border-blue-200 bg-blue-50/60 shadow-xs">
            <CardHeader>
              <CardTitle id="collection-title" className="text-gray-950">
                La colección hoy
              </CardTitle>
              <p className="text-sm text-gray-600">Cifras actualizadas desde el catálogo.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between border-b border-blue-200 pb-4">
                <span className="flex items-center gap-2 text-sm text-gray-700">
                  <BookOpen aria-hidden="true" className="h-4 w-4 text-blue-700" /> Títulos
                </span>
                <strong className="text-2xl text-gray-950">{counts.titleCount}</strong>
              </div>
              <div className="flex items-center justify-between border-b border-blue-200 pb-4">
                <span className="text-sm text-gray-700">Ejemplares</span>
                <strong className="text-2xl text-gray-950">{counts.copyCount}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Disponibles ahora</span>
                <strong className="text-2xl text-blue-800">{counts.availableNow}</strong>
              </div>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}
