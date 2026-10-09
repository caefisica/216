"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminStats } from "./admin-stats";
import { UserManagement } from "./user-management";
import { BorrowingTimeline } from "./borrowing-timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  BookOpen,
  Clock,
  UserCog,
  Activity,
  BarChart3,
  CheckCircle2,
  XCircle,
  Undo2,
} from "lucide-react";
import { toast, toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import { locationLabel } from "../../books/labels";
import {
  getActiveLoans,
  getPendingBorrowRequests,
  returnLoan,
  updateBorrowStatus,
} from "../actions";
import type { ActiveLoan, PendingRequest } from "../types";

interface AdminDashboardProps {
  catalogue: ReactNode;
  initialPendingRequests: PendingRequest[];
  initialActiveLoans: ActiveLoan[];
}

export function AdminDashboard({
  catalogue,
  initialPendingRequests,
  initialActiveLoans,
}: AdminDashboardProps) {
  const router = useRouter();
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>(initialPendingRequests);
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>(initialActiveLoans);
  const [chosenCopies, setChosenCopies] = useState<Record<string, string>>({});

  const refreshLoans = async () => {
    const [pending, active] = await Promise.all([getPendingBorrowRequests(), getActiveLoans()]);
    if (isErr(pending)) toastActionError(pending.error);
    else setPendingRequests(pending.value);
    if (isErr(active)) toastActionError(active.error);
    else setActiveLoans(active.value);
    router.refresh();
  };

  const handleRequestAction = async (req: PendingRequest, action: "approved" | "rejected") => {
    const result = await updateBorrowStatus({
      requestId: req.id,
      status: action,
      copyId:
        action === "approved" ? (chosenCopies[req.id] ?? req.lendableCopies[0]?.id) : undefined,
    });
    if (isErr(result)) {
      toastActionError(result.error);
    } else {
      toast({
        title: action === "approved" ? "Aprobado" : "Rechazado",
        description: `Solicitud de préstamo ${action === "approved" ? "aprobada" : "rechazada"}.`,
      });
    }
    await refreshLoans();
  };

  const handleReturn = async (requestId: string) => {
    const result = await returnLoan({ requestId });
    if (isErr(result)) {
      toastActionError(result.error);
    } else {
      toast({
        title: "Devolución registrada",
        description: "El ejemplar vuelve a estar disponible.",
      });
    }
    await refreshLoans();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
            Gestión de Biblioteca
          </h1>
          <p className="text-gray-500 mt-1 font-medium">Panel de administración v2.0</p>
        </div>
        <Button
          asChild
          className="shadow-lg hover:shadow-xl transition-all duration-200 h-11 px-6 text-sm font-semibold"
        >
          <Link href="/admin/books/create">
            <Plus className="h-5 w-5 mr-1" /> Nuevo Libro
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="books" className="space-y-8">
        <div className="flex flex-col xl:flex-row justify-between gap-6 overflow-x-auto pb-2 scrollbar-hide">
          <TabsList className="h-12 p-1.5 bg-gray-100/80 rounded-2xl border">
            {[
              { value: "books", label: "Colección", icon: <BookOpen className="h-4 w-4" /> },
              {
                value: "requests",
                label: `Préstamos (${pendingRequests.length + activeLoans.length})`,
                icon: <Clock className="h-4 w-4" />,
              },
              { value: "users", label: "Usuarios", icon: <UserCog className="h-4 w-4" /> },
              { value: "history", label: "Actividad", icon: <Activity className="h-4 w-4" /> },
              {
                value: "analytics",
                label: "Estadísticas",
                icon: <BarChart3 className="h-4 w-4" />,
              },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="px-6 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-xs data-[state=active]:text-blue-600 transition-all font-semibold text-xs"
              >
                {tab.icon}
                <span className="ml-2 hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="books" className="space-y-6 focus-visible:outline-hidden">
          {catalogue}
        </TabsContent>

        <TabsContent value="requests" className="space-y-8 focus-visible:outline-hidden">
          <Card className="rounded-3xl border-gray-100 shadow-xs overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b p-6">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Clock className="h-6 w-6 text-orange-500" />
                Pendientes de Aprobación
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pendingRequests.length === 0 ? (
                <div className="py-20 text-center text-gray-500 font-medium italic">
                  Todo al día. No hay solicitudes pendientes.
                </div>
              ) : (
                <div className="divide-y">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 hover:bg-gray-50/30 transition-colors"
                    >
                      <div className="space-y-1.5">
                        <h4 className="font-bold text-gray-900 text-lg leading-tight">
                          <Link href={`/books/${req.book.id}`} className="hover:underline">
                            {req.book.title}
                          </Link>
                          <span className="ml-2 font-mono text-xs font-normal text-gray-500">
                            {req.book.code}
                          </span>
                        </h4>
                        <p className="text-sm text-gray-600 flex items-center gap-2 font-medium">
                          <span className="text-blue-600">@{req.user?.name}</span> •{" "}
                          {req.user?.email}
                        </p>
                        <p className="text-xs text-gray-400 font-medium">
                          Solicitado el{" "}
                          {new Date(req.requestDate).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "long",
                          })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 w-full sm:w-auto">
                        {req.lendableCopies.length === 0 ? (
                          <p className="text-sm text-red-600">
                            Ningún ejemplar disponible: se puede rechazar o esperar una devolución.
                          </p>
                        ) : (
                          <select
                            aria-label="Ejemplar a prestar"
                            className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm"
                            value={chosenCopies[req.id] ?? req.lendableCopies[0].id}
                            onChange={(e) =>
                              setChosenCopies((prev) => ({ ...prev, [req.id]: e.target.value }))
                            }
                          >
                            {req.lendableCopies.map((copy) => (
                              <option key={copy.id} value={copy.id}>
                                {copy.code}
                                {copy.volume ? ` · ${copy.volume}` : ""}
                                {copy.location
                                  ? ` · ${locationLabel(copy.location)}`
                                  : " · sin ubicación"}
                              </option>
                            ))}
                          </select>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="lg"
                            className="flex-1 sm:flex-none h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold"
                            disabled={req.lendableCopies.length === 0}
                            onClick={() => handleRequestAction(req, "approved")}
                          >
                            <CheckCircle2 className="h-5 w-5 mr-2" /> Aprobar
                          </Button>
                          <Button
                            size="lg"
                            variant="ghost"
                            className="flex-1 sm:flex-none h-11 px-6 rounded-xl border-gray-100 font-bold text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleRequestAction(req, "rejected")}
                          >
                            <XCircle className="h-5 w-5 mr-2" /> Rechazar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-gray-100 shadow-xs overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b p-6">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-blue-500" />
                Préstamos activos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {activeLoans.length === 0 ? (
                <div className="py-20 text-center text-gray-500 font-medium italic">
                  No hay libros prestados.
                </div>
              ) : (
                <div className="divide-y">
                  {activeLoans.map((loan) => {
                    const overdue = loan.dueDate !== null && loan.dueDate.getTime() < Date.now();
                    return (
                      <div
                        key={loan.id}
                        className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 hover:bg-gray-50/30 transition-colors"
                      >
                        <div className="space-y-1.5">
                          <h4 className="font-bold text-gray-900 text-lg leading-tight">
                            {loan.book.title}
                            <span className="ml-2 font-mono text-xs font-normal text-gray-500">
                              {loan.copy.code}
                              {loan.copy.volume ? ` · ${loan.copy.volume}` : ""}
                            </span>
                          </h4>
                          <p className="text-sm text-gray-600 flex items-center gap-2 font-medium">
                            <span className="text-blue-600">@{loan.user.name}</span> •{" "}
                            {loan.user.email}
                          </p>
                          {loan.dueDate && (
                            <p
                              className={`text-xs font-medium ${overdue ? "text-red-600" : "text-gray-400"}`}
                            >
                              {overdue ? "Vencido el " : "Vence el "}
                              {loan.dueDate.toLocaleDateString("es-ES", {
                                day: "numeric",
                                month: "long",
                              })}
                            </p>
                          )}
                        </div>
                        <Button
                          size="lg"
                          variant="outline"
                          className="w-full sm:w-auto h-11 px-6 rounded-xl font-bold"
                          onClick={() => handleReturn(loan.id)}
                        >
                          <Undo2 className="h-5 w-5 mr-2" /> Registrar devolución
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="focus-visible:outline-hidden">
          <UserManagement />
        </TabsContent>

        <TabsContent value="history" className="focus-visible:outline-hidden">
          <BorrowingTimeline />
        </TabsContent>

        <TabsContent value="analytics" className="focus-visible:outline-hidden">
          <AdminStats />
        </TabsContent>
      </Tabs>
    </div>
  );
}
