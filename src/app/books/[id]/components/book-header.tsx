import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Edit, User } from "lucide-react";
import type { BookDetailed } from "@/features/books/types";

interface BookHeaderProps {
  book: BookDetailed;
  canEdit: boolean;
}

export function BookHeader({ book, canEdit }: BookHeaderProps) {
  const { category } = book;
  return (
    <div className="mb-5 flex items-start justify-between gap-3 border-b pb-5">
      <div className="flex-1">
        <p className="mb-2 text-sm text-gray-500">
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
          <span className="ml-3 font-mono text-xs">{book.code}</span>
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
          {book.title}
        </h1>
        {book.author && (
          <div className="mb-2 flex items-center text-base text-gray-600">
            <User className="h-5 w-5 mr-2" />
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
