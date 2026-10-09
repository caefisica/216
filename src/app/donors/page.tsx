"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDonors, getDonatedCopies, getDonationsStats } from "@/features/donors/actions";
import type { Donor, DonatedCopy, DonationStats } from "@/features/donors/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Users, BookOpen, Quote } from "lucide-react";

export default function DonorsPage() {
  const [activeDonors, setActiveDonors] = useState<Donor[]>([]);
  const [donatedCopies, setDonatedCopies] = useState<DonatedCopy[]>([]);
  const [stats, setStats] = useState<DonationStats>({
    totalCopies: 0,
    totalDonors: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDonationsData();
  }, []);

  const fetchDonationsData = async () => {
    try {
      setLoading(true);
      const [donorsData, copiesData, statsData] = await Promise.all([
        getDonors(),
        getDonatedCopies(),
        getDonationsStats(),
      ]);

      setActiveDonors(donorsData);
      setDonatedCopies(copiesData);
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching donations data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-100 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none scale-150 rotate-12">
          <Heart className="h-96 w-96 text-red-500 fill-red-500" />
        </div>
        <div className="container mx-auto px-6 py-20 text-center relative z-10">
          <Badge className="mb-6 bg-red-50 text-red-500 border-red-100 font-bold px-4 py-1 rounded-full">
            Nuestros Donantes
          </Badge>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-gray-900 mb-8 leading-tight">
            Gracias a ti, <span className="text-blue-600">seguimos creciendo</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-3xl mx-auto mb-12 font-medium leading-relaxed">
            Cada libro donado es una puerta que se abre para un nuevo lector. Nuestra comunidad se
            fortalece con cada contribución desinteresada de nuestra comunidad académica.
          </p>

          <div className="flex flex-wrap justify-center gap-8">
            <div className="bg-white border border-gray-100 p-8 rounded-3xl shadow-xl shadow-blue-900/5 w-56 transform transition-all hover:scale-105">
              <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-7 w-7 text-blue-600" />
              </div>
              <div className="text-4xl font-black text-gray-900 mb-1">{stats.totalCopies}</div>
              <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                Ejemplares Donados
              </div>
            </div>
            <div className="bg-white border border-gray-100 p-8 rounded-3xl shadow-xl shadow-green-900/5 w-56 transform transition-all hover:scale-105">
              <div className="h-14 w-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                <Users className="h-7 w-7 text-green-600" />
              </div>
              <div className="text-4xl font-black text-gray-900 mb-1">{stats.totalDonors}</div>
              <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                Donantes Únicos
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-16">
        <Tabs defaultValue="donors" className="space-y-12">
          <div className="flex justify-center">
            <TabsList className="bg-gray-100 p-1.5 rounded-2xl h-auto gap-1">
              <TabsTrigger
                value="donors"
                className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-xs font-bold text-sm"
              >
                Muro de Honor
              </TabsTrigger>
              <TabsTrigger
                value="donations"
                className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-xs font-bold text-sm"
              >
                Ejemplares
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="donors">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {loading ? (
                Array(6)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      className="h-64 bg-white border border-gray-100 rounded-3xl animate-pulse shadow-xs"
                    />
                  ))
              ) : activeDonors.length === 0 ? (
                <div className="col-span-full text-center py-24 bg-white rounded-3xl border border-dashed border-gray-200">
                  <p className="text-gray-400 font-bold text-xl uppercase tracking-widest">
                    Aún no hay donantes registrados
                  </p>
                </div>
              ) : (
                activeDonors.map((donor) => (
                  <Card
                    key={donor.id}
                    className="overflow-hidden border-gray-100 shadow-xs hover:shadow-xl transition-all duration-300 rounded-3xl border-none ring-1 ring-black/5"
                  >
                    <CardHeader className="bg-linear-to-br from-blue-50/50 to-white pb-6 pt-8 px-8">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-blue-600/20">
                          {donor.name.charAt(0)}
                        </div>
                        <div>
                          <CardTitle className="text-xl font-bold text-gray-900">
                            {donor.name}
                          </CardTitle>
                          <Badge className="mt-1 bg-blue-50 text-blue-600 border-none font-bold text-[10px] tracking-widest p-0 px-2 uppercase">
                            Donante Miembro
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-8 pb-8 pt-0">
                      <Separator className="mb-6 bg-gray-50" />
                      {donor.motivation ? (
                        <div className="relative pt-4 pb-6 px-1">
                          <Quote className="h-10 w-10 text-blue-50 opacity-50 absolute -top-1 -left-4 z-0" />
                          <p className="text-gray-600 font-medium leading-relaxed italic relative z-10">
                            &quot;{donor.motivation}&quot;
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm font-medium mb-8">
                          Sin mensaje de motivación compartido.
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-tighter">
                        <BookOpen className="h-3.5 w-3.5" />
                        {donor.copyCount === 1
                          ? "1 ejemplar donado"
                          : `${donor.copyCount} ejemplares donados`}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="donations">
            <Card className="border-none shadow-xl shadow-blue-900/5 rounded-3xl overflow-hidden bg-white">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="px-8 py-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">
                          Libro
                        </th>
                        <th className="px-8 py-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">
                          Autor
                        </th>
                        <th className="px-8 py-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">
                          Donante
                        </th>
                        <th className="px-8 py-6 font-black text-gray-400 uppercase tracking-widest text-[10px] text-right">
                          Código
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {donatedCopies.map((copy) => (
                        <tr key={copy.id} className="hover:bg-gray-50/30 transition-colors group">
                          <td className="px-8 py-6">
                            <Link
                              href={`/books/${copy.bookId}`}
                              className="font-bold text-gray-900 block group-hover:text-blue-600 transition-colors"
                            >
                              {copy.title}
                              {copy.volume ? ` · ${copy.volume}` : ""}
                            </Link>
                          </td>
                          <td className="px-8 py-6 text-gray-500 font-medium">{copy.author}</td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-md bg-blue-50 flex items-center justify-center text-[10px] font-black text-blue-600">
                                {copy.donor.name.charAt(0)}
                              </div>
                              <span className="font-bold text-gray-700">{copy.donor.name}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right font-mono text-xs text-gray-400">
                            {copy.code}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
