"use client";

import { useCallback, useEffect, useState } from "react";
import { getFavoriteBooks, setHeart } from "@/features/books/actions";
import { BookCard } from "@/features/books/components/book-card";
import { Heart, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast, toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import type { BookDetailed } from "@/features/books/types";

export function FavoritesClient() {
  const [favoriteBooks, setFavoriteBooks] = useState<BookDetailed[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchFavoriteBooks = useCallback(async () => {
    setLoadingData(true);
    try {
      const result = await getFavoriteBooks({});
      if (isErr(result)) {
        toastActionError(result.error);
        return;
      }
      setFavoriteBooks(result.value as BookDetailed[]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchFavoriteBooks();
  }, [fetchFavoriteBooks]);

  const handleToggleHeart = async (e: React.MouseEvent, bookId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await setHeart({ bookId, hearted: false });
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    setFavoriteBooks((prev) => prev.filter((b) => b.id !== bookId));
    toast({
      title: "Eliminado de favoritos",
      description: "Libro desmarcado.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center">
              <Heart className="h-6 w-6 text-red-500 fill-red-500" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 leading-none">
              Mis Libros <span className="text-red-500">Favoritos</span>
            </h1>
          </div>
          <p className="text-lg text-gray-500 max-w-2xl font-medium">
            Tu colección personal de lecturas destacadas y libros por descubrir.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        {loadingData ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          </div>
        ) : favoriteBooks.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Tu lista está vacía</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-8 font-medium">
              Explora la biblioteca y marca con un corazón los libros que más te gusten.
            </p>
            <Button asChild size="lg" className="rounded-2xl px-8 shadow-md">
              <Link href="/">
                <BookOpen className="h-5 w-5 mr-2" /> Seguir explorando
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {favoriteBooks.map((book, index) => (
              <BookCard
                key={book.id}
                book={book}
                isHearted={true}
                onToggleHeart={(e) => handleToggleHeart(e, book.id)}
                priority={index < 4}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
