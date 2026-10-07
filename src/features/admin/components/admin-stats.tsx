"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { getDetailedAdminStats } from "../actions";
import { toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import type { MonthlyStats, BookStats, UserStats } from "../types";
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Star,
  Clock,
  Target,
  ChevronLeft,
  ChevronRight,
  Heart,
  BookOpen,
} from "lucide-react";

const BOOKS_PER_PAGE = 5;

export function AdminStats() {
  const [loading, setLoading] = useState(true);
  const [allPopularBooks, setAllPopularBooks] = useState<BookStats[]>([]);
  const [currentBooksPage, setCurrentBooksPage] = useState(0);
  const [activeUsers, setActiveUsers] = useState<UserStats[]>([]);
  const [currentUsersPage, setCurrentUsersPage] = useState(0);
  const [monthlyData, setMonthlyData] = useState<MonthlyStats[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalBorrows: 0,
    totalReturns: 0,
    bookUtilizationRate: 0,
    mostActiveMonth: "",
  });

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    const result = await getDetailedAdminStats();
    if (isErr(result)) {
      toastActionError(result.error);
    } else {
      setAllPopularBooks(result.value.popularBooks);
      setActiveUsers(result.value.activeUsers);
      setMonthlyData(result.value.monthlyData);
      setOverallStats(result.value.overallStats);
    }
    setLoading(false);
  };

  const getCurrentBooks = () => {
    const startIndex = currentBooksPage * BOOKS_PER_PAGE;
    return allPopularBooks.slice(startIndex, startIndex + BOOKS_PER_PAGE);
  };

  const getCurrentUsers = () => {
    const startIndex = currentUsersPage * BOOKS_PER_PAGE;
    return activeUsers.slice(startIndex, startIndex + BOOKS_PER_PAGE);
  };

  const totalBooksPages = Math.ceil(allPopularBooks.length / BOOKS_PER_PAGE);
  const totalUsersPages = Math.ceil(activeUsers.length / BOOKS_PER_PAGE);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Disponible</Badge>;
      case "borrowed":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Prestado</Badge>;
      case "maintenance":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Mantenimiento</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="default">Administrador</Badge>;
      case "librarian":
        return <Badge variant="secondary">Bibliotecario</Badge>;
      default:
        return <Badge variant="outline">Usuario</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de préstamos</p>
                <p className="text-2xl font-bold">{overallStats.totalBorrows}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Devoluciones</p>
                <p className="text-2xl font-bold">{overallStats.totalReturns}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Mes más activo</p>
                <p className="text-lg font-bold">{overallStats.mostActiveMonth || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Uso de colección</p>
                <p className="text-2xl font-bold">{overallStats.bookUtilizationRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Books */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Libros más populares
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getCurrentBooks().map((book, index) => (
                <div
                  key={book.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold text-blue-600 w-6">
                      #{currentBooksPage * BOOKS_PER_PAGE + index + 1}
                    </span>
                    <div>
                      <h4 className="font-semibold text-sm">{book.title}</h4>
                      <p className="text-xs text-gray-500">{book.author}</p>
                      <div className="mt-1">{getStatusBadge(book.status)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3 text-blue-600" />
                        <span>{book.borrowCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3 text-red-500" />
                        <span>{book.heartsCount}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Puntaje: {book.popularityScore}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {totalBooksPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentBooksPage((p) => Math.max(0, p - 1))}
                  disabled={currentBooksPage === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <span className="text-xs text-gray-500">
                  Página {currentBooksPage + 1} de {totalBooksPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentBooksPage((p) => Math.min(totalBooksPages - 1, p + 1))}
                  disabled={currentBooksPage === totalBooksPages - 1}
                >
                  Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuarios más activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getCurrentUsers().map((user, index) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold text-green-600 w-6">
                      #{currentUsersPage * BOOKS_PER_PAGE + index + 1}
                    </span>
                    <div>
                      <h4 className="font-semibold text-sm">{user.name}</h4>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getRoleBadge(user.role)}
                    <p className="text-xs text-gray-600 mt-1 font-medium">
                      {user.borrowCount} préstamos
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {totalUsersPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentUsersPage((p) => Math.max(0, p - 1))}
                  disabled={currentUsersPage === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <span className="text-xs text-gray-500">
                  Página {currentUsersPage + 1} de {totalUsersPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentUsersPage((p) => Math.min(totalUsersPages - 1, p + 1))}
                  disabled={currentUsersPage === totalUsersPages - 1}
                >
                  Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Tendencias mensuales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 mt-2">
            {monthlyData.map((m, i) => {
              const maxBorrows = Math.max(...monthlyData.map((d) => d.borrows || 1));
              return (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-gray-700">{m.month}</span>
                    <span className="text-gray-500">
                      {m.borrows} préstamos • {m.returns} devoluciones
                    </span>
                  </div>
                  <div className="space-y-1">
                    <Progress value={(m.borrows / maxBorrows) * 100} className="h-1.5" />
                    <Progress
                      value={(m.returns / maxBorrows) * 100}
                      className="h-1.5 bg-green-50 [&>div]:bg-green-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
