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
    <div className="flex justify-between items-start mb-6">
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
        <h1 className="text-3xl font-bold tracking-tight mb-3">{book.title}</h1>
        {book.author && (
          <div className="flex items-center text-lg text-gray-600 mb-4">
            <User className="h-5 w-5 mr-2" />
            {book.author}
          </div>
        )}
      </div>
      {canEdit && (
        <Button asChild variant="outline">
          <Link href={`/admin/books/${book.id}`}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Link>
        </Button>
      )}
    </div>
  );
}
