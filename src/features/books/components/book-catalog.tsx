"use client";

import { useEffect, useState, useCallback } from "react";
import { BookCard } from "./book-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Loader2 } from "lucide-react";
import { getBooks, setHeart } from "../actions";
import { toast, toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import type { BookStatus } from "@/lib/db/schema";
import type { BookDetailed as Book, Category } from "../types";

interface BookCatalogProps {
  initialBooks: Book[];
  initialCategories: Category[];
}

export function BookCatalog({ initialBooks, initialCategories }: BookCatalogProps) {
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<BookStatus | "all">("all");
  const [loading, setLoading] = useState(false);

  const filterBooks = useCallback(async () => {
    setLoading(true);
    const result = await getBooks({
      search: searchQuery,
      categoryId: selectedCategory,
      status: selectedStatus,
    });
    if (isErr(result)) toastActionError(result.error);
    else setBooks(result.value);
    setLoading(false);
  }, [searchQuery, selectedCategory, selectedStatus]);

  useEffect(() => {
    const handler = setTimeout(() => {
      filterBooks();
    }, 300);
    return () => clearTimeout(handler);
  }, [filterBooks]);

  const handleToggleHeart = async (e: React.MouseEvent, bookId: string, hearted: boolean) => {
    e.preventDefault();
    e.stopPropagation();

    const result = await setHeart({ bookId, hearted: !hearted });
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    const now = result.value.hearted;
    setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, isHearted: now } : b)));

    toast({
      title: now ? "Añadido a favoritos" : "Eliminado de favoritos",
      description: now ? "Libro marcado con un corazón." : "Libro desmarcado.",
    });
  };

  const availableCount = books.filter((b) => b.status === "available").length;

  return (
    <div className="space-y-8">
      {/* Search and Filters */}
      <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center gap-4 bg-white p-6 rounded-2xl border shadow-xs group">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 transition-colors group-focus-within:text-blue-500" />
          <Input
            placeholder="Encuentra tu próximo libro..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-gray-50/50 border-gray-100 rounded-xl focus:bg-white transition-all text-base"
          />
        </div>

        <div className="flex gap-3">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-56 h-12 rounded-xl border-gray-100 bg-gray-50/50">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las materias</SelectItem>
              {initialCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedStatus}
            onValueChange={(value) => setSelectedStatus(value as BookStatus | "all")}
          >
            <SelectTrigger className="w-full md:w-40 h-12 rounded-xl border-gray-100 bg-gray-50/50">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Estado</SelectItem>
              <SelectItem value="available">Disponible</SelectItem>
              <SelectItem value="borrowed">Prestado</SelectItem>
              <SelectItem value="maintenance">Mantenimiento</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Info Badges */}
      <div className="flex items-center gap-2">
        <Badge
          variant="secondary"
          className="px-3 py-1 font-medium bg-blue-50 text-blue-700 border-blue-100"
        >
          {books.length} libros encontrados
        </Badge>
        {availableCount > 0 && (
          <Badge
            variant="outline"
            className="px-3 py-1 font-medium bg-green-50 text-green-700 border-green-100"
          >
            {availableCount} disponibles ahora
          </Badge>
        )}
      </div>

      {/* Results Grid */}
      {loading && books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          <p className="text-lg font-medium">Cargando biblioteca...</p>
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-24 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
          <Filter className="h-16 w-16 mx-auto text-gray-300 mb-6" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No encontramos lo que buscas</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            Prueba ajustando los filtros o usa palabras clave más generales.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {books.map((book, index) => (
            <BookCard
              key={book.id}
              book={book}
              isHearted={!!book.isHearted}
              onToggleHeart={(e) => handleToggleHeart(e, book.id, !!book.isHearted)}
              priority={index < 4}
            />
          ))}
        </div>
      )}
    </div>
  );
}
