"use client";

import type React from "react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  getBookById,
  getCategories,
  updateBook,
  deleteBook,
  uploadBookImage,
  deleteBookImage,
  setCoverImage,
  addBookImage,
} from "@/features/books/actions";
import type { Category, BookImage } from "@/features/books/types";
import { isErr } from "@/lib/result";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BookStatus } from "@/lib/db/schema";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast, toastActionError } from "@/hooks/use-toast";
import { X, Loader2, Save, Trash2, Star, ChevronLeft } from "lucide-react";
import { ImageDropzone } from "@/components/ui/image-dropzone";

interface ImageUpload {
  id: string;
  file: File;
  preview: string;
  isCover: boolean;
  altText: string;
}

export function EditBookClient({ bookId }: { bookId: string }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<BookImage[]>([]);
  const [newImageUploads, setNewImageUploads] = useState<ImageUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    isbn: "",
    publisher: "",
    publicationYear: "",
    pages: "",
    description: "",
    status: "available" as BookStatus,
    location: "",
  });

  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const fetchBookDetails = useCallback(async () => {
    try {
      const bookResult = await getBookById(bookId);
      if (!isErr(bookResult)) {
        const bookData = bookResult.value;
        setFormData({
          title: bookData.title || "",
          author: bookData.author || "",
          isbn: bookData.isbn || "",
          publisher: bookData.publisher || "",
          publicationYear: bookData.publicationYear?.toString() || "",
          pages: bookData.pages?.toString() || "",
          description: bookData.description || "",
          status: bookData.status || "available",
          location: bookData.location || "",
        });
        if (bookData.categoryId) setSelectedCategories([bookData.categoryId]);
        const images = bookData.images || [];
        setExistingImages(images.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)));
      }
    } catch (error) {
      console.error("Error fetching book details:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles del libro.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    fetchCategories();
    fetchBookDetails();
  }, [bookId, fetchBookDetails]);

  const handleImageDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => {
        const newImage: ImageUpload = {
          id: Math.random().toString(36).substring(2, 15),
          file,
          preview: URL.createObjectURL(file),
          isCover: existingImages.length === 0 && newImageUploads.length === 0,
          altText: "",
        };
        setNewImageUploads((prev) => [...prev, newImage]);
      });
    },
    [existingImages.length, newImageUploads.length],
  );

  const handleImageRejection = useCallback(() => {
    toast({
      title: "Archivo(s) rechazado(s)",
      description: "Por favor, sube solo imágenes (JPEG, PNG, WebP).",
      variant: "destructive",
    });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories([categoryId]);
  };

  const removeExistingImage = async (imageId: string) => {
    const result = await deleteBookImage({ imageId, bookId });
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
    toast({
      title: "Imagen eliminada",
      description: "La imagen ha sido eliminada correctamente.",
    });
  };

  const removeNewImage = (imageId: string) => {
    setNewImageUploads((prev) => prev.filter((img) => img.id !== imageId));
  };

  const handleSetCoverImage = async (imageId: string, isExisting: boolean) => {
    if (isExisting) {
      const result = await setCoverImage({ imageId, bookId });
      if (isErr(result)) {
        toastActionError(result.error);
        return;
      }
      setExistingImages((prev) => prev.map((img) => ({ ...img, isCover: img.id === imageId })));
      setNewImageUploads((prev) => prev.map((img) => ({ ...img, isCover: false })));
    } else {
      setNewImageUploads((prev) => prev.map((img) => ({ ...img, isCover: img.id === imageId })));
      setExistingImages((prev) => prev.map((img) => ({ ...img, isCover: false })));
    }
    toast({ title: "Portada actualizada" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.author) {
      toast({
        title: "Información faltante",
        description: "El título y el autor son obligatorios.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const updated = await updateBook({
        id: bookId,
        title: formData.title,
        author: formData.author,
        isbn: formData.isbn,
        publisher: formData.publisher,
        publicationYear: formData.publicationYear ? Number(formData.publicationYear) : undefined,
        pages: formData.pages ? Number(formData.pages) : undefined,
        description: formData.description,
        status: formData.status,
        location: formData.location,
        categoryId: selectedCategories[0] || undefined,
      });
      if (isErr(updated)) {
        toastActionError(updated.error);
        return;
      }

      for (let i = 0; i < newImageUploads.length; i++) {
        const imageUpload = newImageUploads[i];
        const uploadFormData = new FormData();
        uploadFormData.append("file", imageUpload.file);
        const uploaded = await uploadBookImage(uploadFormData);
        if (isErr(uploaded)) {
          toastActionError(uploaded.error);
          return;
        }
        const added = await addBookImage({
          bookId,
          imageUrl: uploaded.value.url,
          isCover: imageUpload.isCover,
          displayOrder: existingImages.length + i,
        });
        if (isErr(added)) {
          toastActionError(added.error);
          return;
        }
      }

      toast({
        title: "Libro actualizado",
        description: "Los cambios se han guardado correctamente.",
      });
      fetchBookDetails();
      setNewImageUploads([]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBook = async () => {
    const result = await deleteBook({ bookId });
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    toast({ title: "Libro eliminado" });
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="text-gray-500 font-medium">Cargando detalles del libro...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <div className="border-b border-gray-100 sticky top-0 z-10 backdrop-blur-md bg-white/80">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild className="rounded-xl">
                <Link href="/">
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight leading-none">
                  Editar Libro
                </h1>
                <p className="text-sm text-gray-500 font-medium mt-1">{formData.title}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold rounded-xl"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-xl font-bold px-6 shadow-lg shadow-blue-600/20"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar Cambios
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="space-y-8">
            <Card className="rounded-3xl border-gray-100 shadow-xs overflow-hidden">
              <CardHeader className="bg-gray-50/30">
                <CardTitle className="text-lg font-bold">Galería de Imágenes</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {existingImages.map((image) => (
                    <div
                      key={image.id}
                      className="group relative aspect-3/4 rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-xs ring-1 ring-black/5"
                    >
                      <Image
                        src={image.imageUrl}
                        alt="Book"
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                        <Button
                          size="sm"
                          variant={image.isCover ? "secondary" : "ghost"}
                          className="w-full text-[10px] h-8 rounded-lg font-bold"
                          onClick={() => handleSetCoverImage(image.id, true)}
                        >
                          <Star
                            className={`h-3 w-3 mr-1 ${image.isCover ? "fill-yellow-500 text-yellow-500" : ""}`}
                          />
                          {image.isCover ? "Portada" : "Usar Portada"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full text-[10px] h-8 rounded-lg font-bold text-red-400 hover:text-red-500 hover:bg-white/10"
                          onClick={() => removeExistingImage(image.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                        </Button>
                      </div>
                      {image.isCover && (
                        <div className="absolute top-2 left-2 bg-yellow-500 text-[8px] font-black tracking-tighter text-white px-2 py-0.5 rounded-full shadow-xs">
                          PORTADA
                        </div>
                      )}
                    </div>
                  ))}
                  <ImageDropzone
                    onDrop={handleImageDrop}
                    onRejection={handleImageRejection}
                    label="Añadir más"
                    className="aspect-3/4 p-4"
                  />
                </div>

                {newImageUploads.length > 0 && (
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                      Nuevas por subir
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {newImageUploads.map((image) => (
                        <div
                          key={image.id}
                          className="relative aspect-3/4 rounded-2xl overflow-hidden border-2 border-blue-100 bg-blue-50/20"
                        >
                          <Image
                            src={image.preview}
                            alt="Upload"
                            fill
                            className="object-cover opacity-60"
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                            <Button
                              size="icon"
                              variant="destructive"
                              className="h-8 w-8 rounded-full shadow-lg"
                              onClick={() => removeNewImage(image.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-[10px] h-6 rounded-md font-bold"
                              onClick={() => handleSetCoverImage(image.id, false)}
                            >
                              {image.isCover ? "Portada" : "Hacer Portada"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <Card className="rounded-3xl border-gray-100 shadow-xs overflow-hidden">
              <CardHeader className="bg-gray-50/50 p-8 border-b border-gray-100">
                <CardTitle className="text-xl font-bold text-gray-900">
                  Detalles del Libro
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {(
                    ["title", "author", "isbn", "publisher", "publicationYear", "pages"] as const
                  ).map((field) => (
                    <div key={field} className="space-y-3">
                      <Label
                        htmlFor={field}
                        className="text-xs font-black uppercase tracking-widest text-gray-400"
                      >
                        {field === "title"
                          ? "Título"
                          : field === "author"
                            ? "Autor"
                            : field === "isbn"
                              ? "ISBN"
                              : field === "publisher"
                                ? "Editorial"
                                : field === "publicationYear"
                                  ? "Año"
                                  : "Páginas"}
                      </Label>
                      <Input
                        id={field}
                        name={field}
                        type={field === "publicationYear" || field === "pages" ? "number" : "text"}
                        value={formData[field]}
                        onChange={handleInputChange}
                        className="h-14 rounded-2xl border-gray-100 bg-gray-50/30"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-gray-400">
                    Categoría Académica
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleCategoryToggle(c.id)}
                        className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all border ${selectedCategories.includes(c.id) ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200" : "bg-white text-gray-600 border-gray-100 hover:bg-gray-50"}`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-50">
                  <div className="space-y-3">
                    <Label className="text-xs font-black uppercase tracking-widest text-gray-400">
                      Estado
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(val) =>
                        setFormData((p) => ({ ...p, status: val as BookStatus }))
                      }
                    >
                      <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="available">Disponible</SelectItem>
                        <SelectItem value="borrowed">Prestado</SelectItem>
                        <SelectItem value="maintenance">Mantenimiento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label
                      htmlFor="location"
                      className="text-xs font-black uppercase tracking-widest text-gray-400"
                    >
                      Ubicación
                    </Label>
                    <Input
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="h-14 rounded-2xl border-gray-100 bg-gray-50/30"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label
                    htmlFor="description"
                    className="text-xs font-black uppercase tracking-widest text-gray-400"
                  >
                    Descripción
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={8}
                    className="rounded-3xl border-gray-100 bg-gray-50/30 leading-relaxed p-6"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl p-8 border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-gray-900">
              ¿Estás absolutamente seguro?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 font-medium text-lg mt-2">
              Esta acción eliminará{" "}
              <span className="font-bold text-gray-900">&quot;{formData.title}&quot;</span>{" "}
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-14 rounded-2xl font-bold bg-gray-50 border-none hover:bg-gray-100">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBook}
              className="h-14 rounded-2xl font-bold bg-red-500 hover:bg-red-600 border-none px-8"
            >
              Eliminar Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
