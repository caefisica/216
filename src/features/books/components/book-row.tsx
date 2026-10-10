import Link from "next/link";
import { Availability } from "@/components/catalogue/availability";
import { BookCover } from "@/components/catalogue/book-cover";
import { CardRow, rowLink } from "@/components/ui/card";
import type { BookListItem } from "../types";

export function BookRow({
  book,
  staff = false,
  priority = false,
  heading: Heading = "h2",
}: {
  book: BookListItem;
  staff?: boolean;
  priority?: boolean;
  /** Set to `h3` when the row follows an `h2` list heading. */
  heading?: "h2" | "h3";
}) {
  return (
    <CardRow className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:gap-x-5">
      <BookCover
        title={book.title}
        author={book.author}
        category={book.category.name}
        imageUrl={book.imageUrl}
        priority={priority}
        compact
        className="row-span-2 self-start sm:row-span-1"
      />
      <div className="min-w-0 self-center">
        <Heading className="font-serif text-lg font-medium text-pretty">
          <Link href={`/books/${book.id}`} {...rowLink}>
            {book.title}
          </Link>
        </Heading>
        {book.author && <p className="mt-0.5 text-muted-foreground">{book.author}</p>}
        <p className="mt-1 text-sm text-muted-foreground">
          {book.category.name}
          {staff && <span className="ml-2 font-mono text-xs">{book.code}</span>}
        </p>
      </div>
      <Availability
        lendable={book.lendableCount}
        total={book.copyCount}
        className="col-start-2 mt-2.5 justify-self-start sm:col-start-3 sm:row-start-1 sm:mt-0 sm:self-center"
      />
    </CardRow>
  );
}
