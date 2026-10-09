import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import type { BookDetailed } from "@/features/books/types";

interface BookHeaderProps {
  book: BookDetailed;
  canEdit: boolean;
  compact?: boolean;
}

export function BookHeader({ book, canEdit, compact = false }: BookHeaderProps) {
  const { category } = book;
  return (
    <div
      className={
        compact
          ? "flex flex-col items-start gap-3"
          : "mb-6 flex items-start justify-between gap-3 border-b border-border pb-6"
      }
    >
      <div className="min-w-0 flex-1">
        <p className="mb-3 text-xs font-medium text-muted-foreground">
          <Link
            href={`/?category=${(category.parent ?? category).code}`}
            className="hover:underline"
          >
            {(category.parent ?? category).name}
          </Link>
          {category.parent && (
            <>
              {" › "}
              <Link href={`/?category=${category.code}`} className="hover:underline">
                {category.name}
              </Link>
            </>
          )}
          <span className="ml-3 font-mono text-[11px]">{book.code}</span>
        </p>
        <h1
          className={
            compact
              ? "text-xl font-semibold leading-tight tracking-tight break-words"
              : "max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl"
          }
        >
          {book.title}
        </h1>
        {book.author && (
          <div className={`text-muted-foreground ${compact ? "mt-2 text-sm" : "mt-3 text-base"}`}>
            {book.author}
          </div>
        )}
      </div>
      {canEdit && (
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/books/${book.id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Editar título
          </Link>
        </Button>
      )}
    </div>
  );
}
