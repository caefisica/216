"use client";

import { useState } from "react";
import { BookImage } from "./components/book-image";
import { BookActions } from "./components/book-actions";
import { BookHeader } from "./components/book-header";
import { BookDetails } from "./components/book-details";
import { EditForm } from "./components/edit-form";
import type { BookFormData } from "./types/book-types";
import { toast } from "@/hooks/use-toast";
import { saveBookWithImages } from "@/features/books/actions/editor";
import { deleteBookImage, setCoverImage } from "@/features/books/actions";
import { useRouter } from "next/navigation";
import type { BookDetailed, Category, BookImage as BookImageData } from "@/features/books/types";
import type { User } from "@/features/users/types";
import { useBookActions } from "./hooks/use-book-actions";

interface BookClientProps {
  initialBook: BookDetailed;
  categories: Category[];
  user: unknown;
}

export default function BookClient({ initialBook, categories, user }: BookClientProps) {
  const router = useRouter();
  const book = initialBook;
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<BookFormData>(initialBook as unknown as BookFormData);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialBook.categories?.map((c) => c.id) || [],
  );
  const [existingImages, setExistingImages] = useState<BookImageData[]>(initialBook.images || []);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    borrowing,
    borrowNote,
    setBorrowNote,
    isHearted,
    heartsCount,
    handleBorrowRequest,
    handleToggleHeart,
  } = useBookActions(user as User, initialBook.id, {
    id: initialBook.id,
    isHearted: initialBook.isHearted,
    heartsCount: initialBook.heartsCount,
  });

  const canEdit = Boolean(
    user &&
    ((user as unknown as User).role === "librarian" || (user as unknown as User).role === "admin"),
  );

  const handleSaveBookAsync = async (
    uploadedImages: {
      id: string;
      url: string;
      fileName: string;
      isCover: boolean;
      altText: string;
    }[],
  ) => {
    setSaving(true);
    try {
      const result = await saveBookWithImages({
        bookId: book.id,
        bookData: {
          title: editForm.title!,
          author: editForm.author!,
          isbn: editForm.isbn || undefined,
          publisher: editForm.publisher || undefined,
          publicationYear: editForm.publicationYear ? Number(editForm.publicationYear) : undefined,
          pages: editForm.pages ? Number(editForm.pages) : undefined,
          description: editForm.description || undefined,
          status: editForm.status!,
          location: editForm.location || undefined,
          categoryId: selectedCategories[0] || undefined,
        },
        uploadedImages,
        selectedCategories,
      });

      if (result.success) {
        toast({ title: "Libro actualizado", description: result.message });
        setIsEditing(false);
        router.refresh();
      } else {
        throw new Error(result.error);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeExistingImage = async (imageId: string) => {
    const result = await deleteBookImage({ imageId, bookId: book.id });
    if (result.success) {
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
      toast({ title: "Imagen eliminada" });
    }
  };

  const handleSetCoverImage = async (imageId: string, isExisting: boolean) => {
    if (isExisting) {
      await setCoverImage({ imageId, bookId: book.id, isExisting });
      setExistingImages((prev) => prev.map((img) => ({ ...img, isCover: img.id === imageId })));
    }
    toast({ title: "Portada actualizada" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <BookImage images={existingImages} title={book.title} />
              <BookActions
                book={book}
                isHearted={isHearted}
                heartsCount={heartsCount}
                onHeart={handleToggleHeart}
                dialogOpen={dialogOpen}
                setDialogOpen={setDialogOpen}
                borrowNote={borrowNote}
                setBorrowNote={setBorrowNote}
                borrowing={borrowing}
                onBorrowRequest={handleBorrowRequest}
              />
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <BookHeader
                book={book}
                canEdit={canEdit}
                isEditing={isEditing}
                onToggleEditing={() => setIsEditing(!isEditing)}
              />
              {isEditing ? (
                <EditForm
                  editForm={editForm}
                  onFormChange={(f, v) => setEditForm((p) => ({ ...p, [f]: v }))}
                  onSave={handleSaveBookAsync}
                  categories={categories}
                  selectedCategories={selectedCategories}
                  onCategoryToggle={(id) =>
                    setSelectedCategories((prev) =>
                      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
                    )
                  }
                  existingImages={existingImages}
                  onImageRemove={removeExistingImage}
                  onSetCover={handleSetCoverImage}
                  saving={saving}
                  userId={(user as unknown as User)?.id}
                />
              ) : (
                <BookDetails book={book} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
