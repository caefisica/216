"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { AuthUser } from "@/features/auth/core/session";
import { signOutAction } from "@/features/auth/actions/session";
import { getUserActivity, updateUserProfile } from "@/features/users/actions";
import type { BorrowRequest } from "@/features/users/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail,
  Edit,
  BookOpen,
  CheckCircle,
  XCircle,
  Clock,
  Info,
  LogOut,
  User,
  Calendar,
} from "lucide-react";
import { toast, toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return (
        <Badge
          variant="outline"
          className="bg-yellow-50 text-yellow-700 border-yellow-200 font-bold rounded-full px-3"
        >
          <Clock className="h-3 w-3 mr-1" /> Pendiente
        </Badge>
      );
    case "approved":
      return (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200 font-bold rounded-full px-3"
        >
          <CheckCircle className="h-3 w-3 mr-1" /> Vigente
        </Badge>
      );
    case "rejected":
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200 font-bold rounded-full px-3"
        >
          <XCircle className="h-3 w-3 mr-1" /> Rechazado
        </Badge>
      );
    case "returned":
      return (
        <Badge
          variant="outline"
          className="bg-gray-50 text-gray-500 border-gray-200 font-bold rounded-full px-3"
        >
          <Info className="h-3 w-3 mr-1" /> Devuelto
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="rounded-full">
          {status}
        </Badge>
      );
  }
}

export function ProfileClient({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user.name);
  const [borrowHistory, setBorrowHistory] = useState<BorrowRequest[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useState(() => {
    getUserActivity()
      .then((result) => {
        if (isErr(result)) toastActionError(result.error);
        else setBorrowHistory(result.value);
      })
      .finally(() => setLoadingData(false));
  });

  const handleNameUpdate = async () => {
    if (!newName.trim()) return;
    const result = await updateUserProfile({ name: newName.trim() });
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    toast({
      title: "Perfil actualizado",
      description: "Tu nombre ha sido modificado correctamente.",
    });
    setIsEditingName(false);
    router.refresh();
  };

  const activeLoans = borrowHistory.filter(
    (req) => req.status === "approved" || req.status === "pending",
  );

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-3xl bg-blue-600 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-blue-600/20">
                {user.name?.charAt(0) || <User className="h-10 w-10" />}
              </div>
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 leading-none mb-2">
                  Mi Perfil
                </h1>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-50 text-blue-600 border-none font-bold text-[10px] tracking-widest px-2 uppercase">
                    {user.role}
                  </Badge>
                  <span className="text-gray-400 font-medium text-sm">•</span>
                  <span className="text-gray-400 font-medium text-sm">{user.email}</span>
                </div>
              </div>
            </div>
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="ghost"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold rounded-2xl h-12"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <Tabs defaultValue="account" className="space-y-10">
          <div className="flex justify-start">
            <TabsList className="bg-white p-1.5 rounded-2xl h-auto gap-1 border border-gray-100 shadow-xs">
              <TabsTrigger
                value="account"
                className="rounded-xl px-10 py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold text-sm transition-all"
              >
                Ajustes
              </TabsTrigger>
              <TabsTrigger
                value="borrowed"
                className="rounded-xl px-10 py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold text-sm transition-all"
              >
                Libros en Curso ({activeLoans.length})
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="rounded-xl px-10 py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold text-sm transition-all"
              >
                Historial
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="account">
            <Card className="rounded-3xl border-gray-100 shadow-xs overflow-hidden bg-white">
              <CardHeader className="p-8 border-b border-gray-50 bg-gray-50/30">
                <CardTitle className="text-xl font-bold">Información Personal</CardTitle>
                <CardDescription className="font-medium text-gray-400">
                  Actualiza los datos básicos de tu cuenta.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <Label
                      htmlFor="name"
                      className="text-xs font-black uppercase tracking-widest text-gray-400"
                    >
                      Nombre Completo
                    </Label>
                    {isEditingName ? (
                      <div className="flex items-center gap-3">
                        <Input
                          id="name"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="h-14 rounded-2xl border-gray-100 bg-gray-50/50"
                        />
                        <Button
                          onClick={handleNameUpdate}
                          className="h-14 px-6 rounded-2xl font-bold shadow-lg shadow-blue-600/10"
                        >
                          Guardar
                        </Button>
                        <Button
                          onClick={() => setIsEditingName(false)}
                          variant="ghost"
                          className="h-14 rounded-2xl font-bold"
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50 group">
                        <p className="text-gray-900 font-bold text-lg">{user.name}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingName(true)}
                          className="rounded-xl font-bold text-blue-600 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4 mr-2" /> Cambiar
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <Label
                      htmlFor="email"
                      className="text-xs font-black uppercase tracking-widest text-gray-400"
                    >
                      Correo Institucional
                    </Label>
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 opacity-60">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <span className="font-bold text-gray-700">{user.email}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="borrowed">
            <div className="grid grid-cols-1 gap-6">
              {loadingData ? (
                Array(2)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      className="h-32 bg-white rounded-3xl animate-pulse border border-gray-100 shadow-xs"
                    />
                  ))
              ) : activeLoans.length === 0 ? (
                <Card className="rounded-3xl border-dashed border-2 border-gray-200 bg-transparent text-center py-20">
                  <BookOpen className="h-14 w-14 text-gray-200 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    No tienes préstamos activos
                  </h3>
                  <p className="text-gray-400 font-medium mb-6">
                    Explora el catálogo y solicita tu próximo libro.
                  </p>
                  <Button asChild className="rounded-2xl font-bold px-8" variant="secondary">
                    <Link href="/">Ir al catálogo</Link>
                  </Button>
                </Card>
              ) : (
                activeLoans.map((req) => (
                  <Card
                    key={req.id}
                    className="rounded-3xl border-gray-100 shadow-xs overflow-hidden bg-white hover:shadow-md transition-shadow group"
                  >
                    <CardContent className="p-8">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex gap-6">
                          <div className="h-20 w-16 relative bg-gray-50 rounded-xl overflow-hidden border shrink-0">
                            {req.book?.imageUrl && (
                              <Image
                                src={req.book.imageUrl}
                                alt={req.book.title}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            )}
                          </div>
                          <div>
                            <Link
                              href={`/books/${req.book?.id}`}
                              className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors"
                            >
                              {req.book?.title}
                            </Link>
                            <p className="text-gray-500 font-medium mb-2">{req.book?.author}</p>
                            {req.copy && (
                              <p className="mb-2 font-mono text-xs text-gray-500">
                                Ejemplar {req.copy.code}
                                {req.copy.volume ? ` · ${req.copy.volume}` : ""}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-tighter">
                              <Calendar className="h-3.5 w-3.5" />
                              Solicitado el {new Date(req.requestDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-3 self-end md:self-center">
                          {getStatusBadge(req.status)}
                          {req.status === "approved" && req.dueDate && (
                            <span className="text-[10px] font-black text-red-500 uppercase">
                              Vence el {new Date(req.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card className="rounded-3xl border-gray-100 shadow-xs overflow-hidden bg-white">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="px-8 py-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">
                          Libro
                        </th>
                        <th className="px-8 py-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">
                          Estado
                        </th>
                        <th className="px-8 py-6 font-black text-gray-400 uppercase tracking-widest text-[10px] text-right">
                          Fecha
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {borrowHistory.map((req) => (
                        <tr key={req.id} className="hover:bg-gray-50/30 transition-colors group">
                          <td className="px-8 py-6">
                            <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {req.book?.title}
                            </span>
                          </td>
                          <td className="px-8 py-6">{getStatusBadge(req.status)}</td>
                          <td className="px-8 py-6 text-right font-medium text-gray-400">
                            {new Date(req.requestDate).toLocaleDateString()}
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
