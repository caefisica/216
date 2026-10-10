import Link from "next/link";
import { NotFoundState } from "@/app/books/[id]/components/not-found-state";
import { Page } from "@/components/ui/page";
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
      <Page width="prose">
        <h1 className="mb-6 text-xl font-semibold">Registrar libro</h1>
        <BookIntakeForm facets={facets} />
      </Page>
    );
  }
  if (isErr(book)) return <NotFoundState />;

  return (
    <Page width="prose">
      <Link
        href={`/books/${book.value.id}`}
        className="inline-flex min-h-control items-center text-muted-foreground underline-offset-2 hover:underline"
      >
        ← {book.value.title}
      </Link>
      <h1 className="mb-6 text-xl font-semibold">
        Editar libro{" "}
        <span className="ml-2 font-mono text-sm text-muted-foreground">{book.value.code}</span>
      </h1>
      <BookEditor key={book.value.id} facets={facets} book={book.value} />
    </Page>
  );
}
