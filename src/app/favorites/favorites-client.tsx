"use client";

import { useState } from "react";
import { setHeart } from "@/features/books/actions";
import { BookCard } from "@/features/books/components/book-card";
import { Heart, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast, toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import type { BookListItem } from "@/features/books/types";

export function FavoritesClient({ initialBooks }: { initialBooks: BookListItem[] }) {
  const [favoriteBooks, setFavoriteBooks] = useState(initialBooks);

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
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-surface">
        <div className="container mx-auto px-6 py-12">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent">
              <Heart className="h-6 w-6 fill-current text-status-favorite" />
            </div>
            <h1 className="text-4xl font-extrabold leading-none tracking-tight">
              Mis Libros <span className="text-status-favorite">Favoritos</span>
            </h1>
          </div>
          <p className="max-w-2xl text-lg font-medium text-muted-foreground">
            Tu colección personal de lecturas destacadas y libros por descubrir.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        {favoriteBooks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface py-24 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-surface-muted">
              <Heart className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-2xl font-bold">Tu lista está vacía</h3>
            <p className="mx-auto mb-8 max-w-sm font-medium text-muted-foreground">
              Explora la biblioteca y marca con un corazón los libros que más te gusten.
            </p>
            <Button asChild size="lg" className="rounded-2xl px-8 shadow-md">
              <Link href="/">
                <BookOpen className="h-5 w-5 mr-2" /> Seguir explorando
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
