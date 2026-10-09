"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookCover } from "@/components/catalogue/book-cover";
import type { AuthUser } from "@/features/auth/core/session";
import { signOutAction } from "@/features/auth/actions/session";
import { updateUserProfile } from "@/features/users/actions";
import type { BorrowRequest } from "@/features/users/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Edit, BookOpen, LogOut, User, Calendar } from "lucide-react";
import { toast, toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import { LoanHistory, getStatusBadge } from "./loan-history";

export function ProfileClient({
  user,
  borrowHistory,
}: {
  user: AuthUser;
  borrowHistory: BorrowRequest[];
}) {
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user.name);

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
    <div className="min-h-screen">
      <div className="border-b border-border bg-surface">
        <div className="container mx-auto px-3 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
                {user.name?.charAt(0) || <User className="h-10 w-10" />}
              </div>
              <div>
                <h1 className="mb-2 text-3xl font-semibold leading-none tracking-tight">
                  Mi Perfil
                </h1>
                <div className="flex items-center gap-2">
                  <Badge className="border-none bg-accent px-2 text-[10px] font-semibold uppercase tracking-widest text-accent-foreground">
                    {user.role}
                  </Badge>
                  <span className="text-sm font-medium text-muted-foreground">·</span>
                  <span className="text-sm font-medium text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </div>
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="ghost"
                className="h-10 font-medium text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 py-8 sm:px-6 sm:py-10">
        <Tabs defaultValue="account" className="space-y-6">
          <div className="flex justify-start">
            <TabsList className="h-auto gap-1 border border-border bg-surface p-1.5">
              <TabsTrigger
                value="account"
                className="px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground sm:px-8"
              >
                Ajustes
              </TabsTrigger>
              <TabsTrigger
                value="borrowed"
                className="px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground sm:px-8"
              >
                Libros en Curso ({activeLoans.length})
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground sm:px-8"
              >
                Historial
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="account">
            <Card className="surface overflow-hidden shadow-xs">
              <CardHeader className="border-b border-border bg-surface-muted/50 p-6 sm:p-8">
                <CardTitle className="text-xl font-bold">Información Personal</CardTitle>
                <CardDescription className="font-medium text-muted-foreground">
                  Actualiza los datos básicos de tu cuenta.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <Label
                      htmlFor="name"
                      className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                    >
                      Nombre Completo
                    </Label>
                    {isEditingName ? (
                      <div className="flex items-center gap-3">
                        <Input
                          id="name"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="h-12 border-border bg-surface-muted"
                        />
                        <Button onClick={handleNameUpdate} className="h-12 px-6 font-medium">
                          Guardar
                        </Button>
                        <Button
                          onClick={() => setIsEditingName(false)}
                          variant="ghost"
                          className="h-12 font-medium"
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between border border-border bg-surface-muted p-4 group">
                        <p className="text-lg font-semibold">{user.name}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingName(true)}
                          className="font-medium text-primary hover:bg-accent"
                        >
                          <Edit className="h-4 w-4 mr-2" /> Cambiar
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <Label
                      htmlFor="email"
                      className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                    >
                      Correo Institucional
                    </Label>
                    <div className="flex items-center gap-3 border border-border bg-surface-muted p-4 opacity-70">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <span className="font-semibold text-muted-foreground">{user.email}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="borrowed">
            <div className="grid grid-cols-1 gap-6">
              {activeLoans.length === 0 ? (
                <Card className="border-2 border-dashed border-border bg-transparent py-20 text-center">
                  <BookOpen className="mx-auto mb-4 h-14 w-14 text-muted-foreground/40" />
                  <h3 className="mb-2 text-xl font-semibold">No tienes préstamos activos</h3>
                  <p className="mb-6 font-medium text-muted-foreground">
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
                    className="surface overflow-hidden shadow-xs transition-shadow group hover:shadow-md"
                  >
                    <CardContent className="p-8">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex gap-6">
                          <div className="w-16 shrink-0 overflow-hidden rounded border border-border">
                            {req.book && (
                              <BookCover
                                title={req.book.title}
                                author={req.book.author}
                                category={req.book.category.name}
                                imageUrl={req.book.imageUrl}
                              />
                            )}
                          </div>
                          <div>
                            <Link
                              href={`/books/${req.book?.id}`}
                              className="text-xl font-semibold transition-colors group-hover:text-primary"
                            >
                              {req.book?.title}
                            </Link>
                            <p className="mb-2 font-medium text-muted-foreground">
                              {req.book?.author}
                            </p>
                            {req.copy && (
                              <p className="mb-2 font-mono text-xs text-muted-foreground">
                                Ejemplar {req.copy.code}
                                {req.copy.volume ? ` · ${req.copy.volume}` : ""}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-tighter text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              Solicitado el {new Date(req.requestDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-3 self-end md:self-center">
                          {getStatusBadge(req.status)}
                          {req.status === "approved" && req.dueDate && (
                            <span className="text-[10px] font-semibold uppercase text-destructive">
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
            <LoanHistory borrowHistory={borrowHistory} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
