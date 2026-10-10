import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NotFoundState } from "@/app/books/[id]/components/not-found-state";
import { Page, PageTitle } from "@/components/ui/page";
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
        <PageTitle className="mb-6">Registrar libro</PageTitle>
        <BookIntakeForm facets={facets} />
      </Page>
    );
  }
  if (isErr(book)) return <NotFoundState />;

  return (
    <Page width="prose">
      <Link
        href={`/books/${book.value.id}`}
        className="-ml-2 inline-flex min-h-control items-center gap-1.5 rounded-sm px-2 text-sm font-medium text-muted-foreground transition-colors duration-100 hover:bg-sunken hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {book.value.title}
      </Link>
      <PageTitle className="mt-2 mb-6">
        Editar libro{" "}
        <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">
          {book.value.code}
        </span>
      </PageTitle>
      <BookEditor key={book.value.id} facets={facets} book={book.value} />
    </Page>
  );
}
