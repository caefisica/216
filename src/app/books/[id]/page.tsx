import { getSession } from "@/features/auth/protected-action";
import { getBookById } from "@/features/books/actions";
import BookClient from "./book-client";
import { NotFoundState } from "./components/not-found-state";
import { isErr } from "@/lib/result";

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getSession();

  const book = await getBookById(id);

  if (isErr(book)) {
    return <NotFoundState />;
  }

  return <BookClient book={book.value} user={user?.emailVerified ? user : null} />;
}
