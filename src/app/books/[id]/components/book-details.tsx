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
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Descripción
            </h3>
            <p className="text-gray-700 leading-relaxed">{book.description}</p>
          </div>
        </>
      )}

      <Separator className="my-6" />

      <div>
        <h3 className="text-lg font-semibold mb-4">Ejemplares ({book.copies.length})</h3>
        <CopiesTable copies={book.copies} canEdit={canEdit} />
        {book.isbn && <p className="mt-4 text-sm text-gray-500">ISBN {book.isbn}</p>}
      </div>
    </>
  );
}
