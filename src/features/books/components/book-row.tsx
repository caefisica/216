import Link from "next/link";
import { Availability } from "@/components/catalogue/availability";
import { BookCover } from "@/components/catalogue/book-cover";
import type { BookListItem } from "../types";

export function BookRow({
  book,
  staff = false,
  priority = false,
}: {
  book: BookListItem;
  staff?: boolean;
  priority?: boolean;
}) {
  return (
    <li>
      <Link
        href={`/books/${book.id}`}
        className="-mx-2 grid grid-cols-[3rem_1fr] gap-x-3 gap-y-1 rounded-md px-2 py-3 hover:bg-sunken sm:grid-cols-[3rem_1fr_auto] sm:items-center"
      >
        <BookCover
          title={book.title}
          author={book.author}
          category={book.category.name}
          imageUrl={book.imageUrl}
          priority={priority}
          compact
          className="row-span-2 sm:row-span-1"
        />
        <div className="min-w-0">
          <h2 className="font-serif text-lg font-semibold leading-snug text-balance">
            {book.title}
          </h2>
          {book.author && <p className="text-muted-foreground">{book.author}</p>}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {staff && <span className="mr-2 font-mono">{book.code}</span>}
            {book.category.name}
          </p>
        </div>
        <Availability
          lendable={book.lendableCount}
          total={book.copyCount}
          className="col-start-2 sm:col-start-3"
        />
      </Link>
    </li>
  );
}
