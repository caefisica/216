"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AdminStats } from "./admin-stats";
import { UserManagement } from "./user-management";
import { BorrowingTimeline } from "./borrowing-timeline";
import { CatalogueManagement } from "../../books/components/catalogue-management";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, BookOpen, UserCog, Activity, BarChart3, MapPin, ClipboardList } from "lucide-react";
import { overdueCountLabel } from "../../loans/format";
import type { LoanCounts } from "../../loans/types";
import type { CatalogueFacets, LocationOption } from "../../books/types";

interface AdminDashboardProps {
  catalogue: ReactNode;
  facets: CatalogueFacets & { locations: LocationOption[] };
  loanCounts: LoanCounts;
}

function loanSummary({ pending, overdue }: LoanCounts) {
  const parts = [
    `${pending} ${pending === 1 ? "solicitud" : "solicitudes"}`,
    overdueCountLabel(overdue),
  ];
  return parts.join(" · ");
}

export function AdminDashboard({ catalogue, facets, loanCounts }: AdminDashboardProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-start justify-between gap-3 border-b pb-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            216 · gestión
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Colección
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Inventario, préstamos y tareas de sala en un solo lugar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-10 px-4 text-sm font-semibold">
            <Link href="/admin/loans">
              <ClipboardList /> Préstamos · {loanSummary(loanCounts)}
            </Link>
          </Button>
          <Button asChild className="h-10 px-4 text-sm font-semibold">
            <Link href="/admin/books/create">
              <Plus /> Nuevo título
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="books" className="space-y-8">
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-10 rounded-lg border bg-surface-muted p-1">
            {[
              { value: "books", label: "Colección", icon: <BookOpen className="h-4 w-4" /> },
              { value: "users", label: "Usuarios", icon: <UserCog className="h-4 w-4" /> },
              { value: "history", label: "Actividad", icon: <Activity className="h-4 w-4" /> },
              {
                value: "analytics",
                label: "Estadísticas",
                icon: <BarChart3 className="h-4 w-4" />,
              },
              { value: "management", label: "Sala", icon: <MapPin className="h-4 w-4" /> },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-md px-3 text-xs font-semibold data-[state=active]:bg-surface data-[state=active]:text-primary data-[state=active]:shadow-xs sm:px-4"
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

        <TabsContent value="users" className="focus-visible:outline-hidden">
          <UserManagement />
        </TabsContent>

        <TabsContent value="history" className="focus-visible:outline-hidden">
          <BorrowingTimeline />
        </TabsContent>

        <TabsContent value="analytics" className="focus-visible:outline-hidden">
          <AdminStats />
        </TabsContent>

        <TabsContent value="management" className="focus-visible:outline-hidden">
          <CatalogueManagement facets={facets} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
