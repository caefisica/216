"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookImage } from "./components/book-image";
import { BookActions } from "./components/book-actions";
import { BookHeader } from "./components/book-header";
import { BookDetails } from "./components/book-details";
import { LIST_STORAGE_KEY } from "@/features/books/components/book-catalog";
import type { BookDetailed } from "@/features/books/types";
import type { AuthUser } from "@/features/auth/core/session";
import { useBookActions } from "./hooks/use-book-actions";

interface BookClientProps {
  book: BookDetailed;
  user: AuthUser | null;
}

export default function BookClient({ book, user }: BookClientProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    borrowing,
    borrowNote,
    setBorrowNote,
    isHearted,
    heartsCount,
    handleBorrowRequest,
    handleToggleHeart,
  } = useBookActions(user, book.id, {
    id: book.id,
    isHearted: book.isHearted,
    heartsCount: book.heartsCount,
  });

  const canEdit = user?.role === "librarian" || user?.role === "admin";

  useEffect(() => {
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
  }, [book.id, router]);

  return (
    <div className="bg-gray-50/70">
      <div className="container mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[18rem_1fr] lg:gap-8">
          <div>
            <div className="lg:sticky lg:top-24">
              <BookImage images={book.images} title={book.title} />
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
          <div className="space-y-5">
            <div className="rounded-lg border bg-white p-4 shadow-xs sm:p-6">
              <BookHeader book={book} canEdit={canEdit} />
              <BookDetails book={book} canEdit={canEdit} />
              <p className="mt-6 text-xs text-gray-400">
                ↑ ↓ título anterior o siguiente de la lista
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
