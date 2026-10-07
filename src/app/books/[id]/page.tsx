import { getSession } from "@/features/auth/protected-action";
import { getBookById, getCategories } from "@/features/books/actions";
import BookClient from "./book-client";
import { NotFoundState } from "./components/not-found-state";
import type { BookDetailed } from "@/features/books/types";
import { isErr } from "@/lib/result";

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getSession();

  const [book, categories] = await Promise.all([getBookById(id), getCategories()]);

  if (isErr(book)) {
    return <NotFoundState />;
  }

  return (
    <BookClient
      initialBook={book.value as BookDetailed}
      categories={categories}
      user={user?.emailVerified ? user : null}
    />
  );
}
