import { Separator } from "@/components/ui/separator";
import { FileText } from "lucide-react";
import { CopiesTable } from "./copies-table";
import type { BookDetailed } from "@/features/books/types";

interface BookDetailsProps {
  book: BookDetailed;
  canEdit: boolean;
}

export function BookDetails({ book, canEdit }: BookDetailsProps) {
  return (
    <>
      {book.description && (
        <>
          <Separator className="my-6" />
          <div>
            <h3 className="mb-3 flex items-center text-base font-semibold">
              <FileText className="h-5 w-5 mr-2" />
              Descripción
            </h3>
            <p className="text-gray-700 leading-relaxed">{book.description}</p>
          </div>
        </>
      )}

      <Separator className="my-6" />

      <div>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h3 className="text-base font-semibold">Ejemplares</h3>
          <p className="text-xs text-gray-500">
            {book.lendableCount} disponibles de {book.copies.length}
          </p>
        </div>
        <CopiesTable copies={book.copies} canEdit={canEdit} />
        {book.isbn && <p className="mt-4 text-sm text-gray-500">ISBN {book.isbn}</p>}
      </div>
    </>
  );
}
