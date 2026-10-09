import Link from "next/link";
import { NotFoundState } from "@/app/books/[id]/components/not-found-state";
import { isErr } from "@/lib/result";
import { getBookByIdService, getFacetsService } from "../service";
import { BookEditor } from "./book-editor";
import { BookIntakeForm } from "./book-intake-form";

/** Loads what the editor needs. The page above it has already checked that the caller is staff. */
export async function BookEditorLoader({ bookId }: { bookId?: string }) {
  const [facets, book] = await Promise.all([
    getFacetsService(),
    bookId ? getBookByIdService(bookId) : undefined,
  ]);

  if (!book) {
    return (
      <div className="container mx-auto max-w-5xl px-3 py-5 sm:px-6 sm:py-8">
        <BookIntakeForm facets={facets} />
      </div>
    );
  }
  if (isErr(book)) return <NotFoundState />;

  return (
    <div className="container mx-auto max-w-5xl space-y-4 px-3 py-5 sm:px-6 sm:py-8">
      <Link href={`/books/${book.value.id}`} className="text-sm text-primary hover:underline">
        ← {book.value.code} · {book.value.title}
      </Link>
      <BookEditor key={book.value.id} facets={facets} book={book.value} />
    </div>
  );
}
