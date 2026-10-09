"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookImage } from "./components/book-image";
import { BookActions } from "./components/book-actions";
import { BookHeader } from "./components/book-header";
import { BookDetails } from "./components/book-details";
import { LIST_STORAGE_KEY } from "@/features/books/catalogue-state";
import type { FavoriteState } from "@/features/books/catalogue-state";
import type { BookDetailed } from "@/features/books/types";
import type { AuthUser } from "@/features/auth/core/session";
import { useBookActions } from "./hooks/use-book-actions";

interface BookClientProps {
  book: BookDetailed;
  user: AuthUser | null;
  variant?: "page" | "pane";
  onClose?: () => void;
  favorite?: FavoriteState;
  onFavoriteChange?: (favorite: FavoriteState) => void;
}

export default function BookClient({
  book,
  user,
  variant = "page",
  onClose,
  favorite,
  onFavoriteChange,
}: BookClientProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const inPane = variant === "pane";

  const {
    borrowing,
    borrowNote,
    setBorrowNote,
    isHearted,
    heartsCount,
    handleBorrowRequest,
    handleToggleHeart,
  } = useBookActions(
    user,
    book.id,
    {
      id: book.id,
      isHearted: book.isHearted,
      heartsCount: book.heartsCount,
    },
    { favorite, onFavoriteChange },
  );

  const canEdit = user?.role === "librarian" || user?.role === "admin";

  useEffect(() => {
    if (inPane) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement).tagName)) return;
      const ids: string[] = JSON.parse(sessionStorage.getItem(LIST_STORAGE_KEY) ?? "[]");
      const next = ids[ids.indexOf(book.id) + (event.key === "ArrowDown" ? 1 : -1)];
      if (next) {
        event.preventDefault();
        router.push(`/books/${next}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [book.id, inPane, router]);

  if (inPane) {
    return (
      <div
        data-testid="catalogue-detail-pane"
        className="surface flex min-h-[38rem] flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <p className="eyebrow">Detalle del título</p>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/books/${book.id}`}>Abrir página</Link>
            </Button>
            <Button variant="ghost" size="icon" aria-label="Cerrar detalle" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-[8rem_minmax(0,1fr)] items-start gap-4">
            <BookImage
              images={book.images}
              title={book.title}
              author={book.author}
              category={book.category.name}
              className="mb-0 max-w-none"
            />
            <BookHeader book={book} canEdit={canEdit} compact />
          </div>
          <BookActions
            book={book}
            isHearted={isHearted}
            heartsCount={heartsCount}
            onHeart={handleToggleHeart}
            dialogOpen={dialogOpen}
            setDialogOpen={setDialogOpen}
            borrowNote={borrowNote}
            setBorrowNote={setBorrowNote}
            borrowing={borrowing}
            onBorrowRequest={handleBorrowRequest}
          />
          <BookDetails book={book} canEdit={canEdit} copiesLayout="stacked" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="container mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6">
          <div>
            <div className="lg:sticky lg:top-20">
              <BookImage
                images={book.images}
                title={book.title}
                author={book.author}
                category={book.category.name}
              />
              <BookActions
                book={book}
                isHearted={isHearted}
                heartsCount={heartsCount}
                onHeart={handleToggleHeart}
                dialogOpen={dialogOpen}
                setDialogOpen={setDialogOpen}
                borrowNote={borrowNote}
                setBorrowNote={setBorrowNote}
                borrowing={borrowing}
                onBorrowRequest={handleBorrowRequest}
              />
            </div>
          </div>
          <div className="space-y-6">
            <div className="surface h-fit p-4 sm:p-6">
              <BookHeader book={book} canEdit={canEdit} />
              <p className="text-xs text-muted-foreground">
                ↑ ↓ título anterior o siguiente de la lista
              </p>
            </div>
            <div className="surface h-fit p-4 sm:p-6">
              <BookDetails book={book} canEdit={canEdit} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
