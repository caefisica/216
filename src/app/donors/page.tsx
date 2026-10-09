import Link from "next/link";
import { BookOpen, Heart, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listDonorGifts } from "@/features/donors/repository";

export default async function DonorsPage() {
  const donations = await listDonorGifts();

  return (
    <div className="bg-gray-50/50">
      <section className="border-b bg-white">
        <div className="container mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <Badge className="mb-4 bg-blue-50 text-blue-700 hover:bg-blue-50">Comunidad 216</Badge>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-gray-950 sm:text-5xl">
            Libros que llegaron gracias a nuestra comunidad
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
            Reconocemos a las personas que hicieron crecer la colección de física. Cada título está
            enlazado con el catálogo para que puedas consultar sus ejemplares.
          </p>
          <div className="mt-8 grid max-w-xl grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-xl border bg-white p-4 shadow-xs sm:p-5">
              <BookOpen aria-hidden="true" className="h-5 w-5 text-blue-700" />
              <p className="mt-3 text-2xl font-bold text-gray-950">{donations.totalCopies}</p>
              <p className="text-sm text-gray-600">ejemplares donados</p>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-xs sm:p-5">
              <Users aria-hidden="true" className="h-5 w-5 text-blue-700" />
              <p className="mt-3 text-2xl font-bold text-gray-950">{donations.totalDonors}</p>
              <p className="text-sm text-gray-600">donantes reconocidos</p>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-950">Muro de honor</h2>
            <p className="mt-1 text-sm text-gray-600">Donantes y títulos que aportaron.</p>
          </div>
          <Heart aria-hidden="true" className="h-6 w-6 text-blue-700" />
        </div>

        {donations.donors.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-white px-6 py-16 text-center">
            <p className="font-medium text-gray-950">Todavía no hay donaciones registradas.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {donations.donors.map((donor) => (
              <Card key={donor.id} className="border-gray-200 shadow-xs">
                <CardHeader className="border-b bg-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl text-gray-950">{donor.name}</CardTitle>
                      {donor.motivation && (
                        <p className="mt-2 text-sm italic leading-6 text-gray-600">
                          “{donor.motivation}”
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {donor.copyCount} {donor.copyCount === 1 ? "ejemplar" : "ejemplares"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  <h3 className="text-sm font-semibold text-gray-950">Títulos donados</h3>
                  <ul className="mt-3 divide-y rounded-lg border">
                    {donor.books.map((book) => (
                      <li key={book.id} className="p-3">
                        <Link
                          href={`/books/${book.id}`}
                          className="block rounded-sm text-sm font-medium text-gray-950 underline-offset-4 hover:text-blue-700 hover:underline focus:outline-hidden focus:ring-2 focus:ring-blue-700"
                        >
                          {book.title}
                        </Link>
                        <p className="mt-1 text-xs text-gray-600">
                          {book.author || "Autor no registrado"} · {book.copyCount}{" "}
                          {book.copyCount === 1 ? "ejemplar" : "ejemplares"} · {book.code}
                        </p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
