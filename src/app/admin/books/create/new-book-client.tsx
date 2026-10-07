"use client";

import type React from "react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getCategories, createBook, uploadBookImage, addBookImage } from "@/features/books/actions";
import { getPlaceholderUrl } from "@/lib/placeholders";
import type { Category } from "@/features/books/types";

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
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast, toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import { Loader2, Save, Star, Trash2 } from "lucide-react";
import { ImageDropzone } from "@/components/ui/image-dropzone";

interface ImageUpload {
  id: string;
  file: File;
  preview: string;
  isCover: boolean;
  altText: string;
}

export function NewBookClient() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [imageUploads, setImageUploads] = useState<ImageUpload[]>([]);
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

  useEffect(() => {
    getCategories()
      .then((data) => setCategories(data || []))
      .catch(() =>
        toast({
          title: "Error",
          description: "No se pudieron cargar las categorías.",
          variant: "destructive",
        }),
      );
  }, []);

  const handleImageDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      setImageUploads((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 15),
          file,
          preview: URL.createObjectURL(file),
          isCover: prev.length === 0,
          altText: "",
        },
      ]);
    });
  }, []);

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
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    );
  };

  const removeImage = (imageId: string) => {
    setImageUploads((prev) => {
      const updated = prev.filter((img) => img.id !== imageId);
      if (updated.length > 0 && !updated.some((img) => img.isCover)) updated[0].isCover = true;
      return updated;
    });
  };

  const setCoverImage = (imageId: string) => {
    setImageUploads((prev) => prev.map((img) => ({ ...img, isCover: img.id === imageId })));
  };

  const updateImageAltText = (imageId: string, altText: string) => {
    setImageUploads((prev) => prev.map((img) => (img.id === imageId ? { ...img, altText } : img)));
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
    if (imageUploads.length === 0) {
      toast({
        title: "Imagen requerida",
        description: "Por favor, añade al menos una imagen.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const bookResult = await createBook({
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
      if (isErr(bookResult)) {
        toastActionError(bookResult.error);
        return;
      }

      for (let i = 0; i < imageUploads.length; i++) {
        const imgUpload = imageUploads[i];
        const uploadFormData = new FormData();
        uploadFormData.append("file", imgUpload.file);
        const uploaded = await uploadBookImage(uploadFormData);
        if (isErr(uploaded)) {
          toastActionError(uploaded.error);
          return;
        }
        const added = await addBookImage({
          bookId: bookResult.value.id,
          imageUrl: uploaded.value.url,
          isCover: imgUpload.isCover,
          displayOrder: i,
        });
        if (isErr(added)) {
          toastActionError(added.error);
          return;
        }
      }

      toast({ title: "Libro añadido", description: "El libro se ha añadido correctamente." });
      router.push("/");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
              Añadir nuevo libro
            </h1>
            <p className="text-lg text-gray-500 font-medium">
              Expande la colección bibliográfica de la facultad
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-10">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="space-y-8">
              <Card className="rounded-2xl shadow-xs border-gray-100">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Imágenes del libro</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ImageDropzone onDrop={handleImageDrop} onRejection={handleImageRejection} />
                  {imageUploads.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-sm text-gray-900">
                        Previsualización ({imageUploads.length})
                      </h4>
                      <div className="space-y-3">
                        {imageUploads.map((imageUpload, index) => (
                          <div
                            key={imageUpload.id}
                            className="relative border border-gray-100 rounded-2xl p-4 transition-all hover:shadow-md bg-white group"
                          >
                            <div className="flex items-start gap-4">
                              <div className="relative w-20 h-24 shrink-0 bg-gray-50 rounded-xl overflow-hidden border">
                                <Image
                                  src={imageUpload.preview || getPlaceholderUrl(300, 400)}
                                  alt={`Imagen ${index + 1}`}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="flex-1 space-y-3">
                                <Input
                                  placeholder="Alt text"
                                  value={imageUpload.altText}
                                  onChange={(e) =>
                                    updateImageAltText(imageUpload.id, e.target.value)
                                  }
                                  className="h-8 text-xs rounded-lg border-gray-100"
                                />
                                <div className="flex gap-2">
                                  {!imageUpload.isCover && (
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => setCoverImage(imageUpload.id)}
                                      className="h-7 text-[10px] font-bold px-3 rounded-lg"
                                    >
                                      <Star className="h-3 w-3 mr-1" /> Portada
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeImage(imageUpload.id)}
                                    className="h-7 text-[10px] font-bold px-3 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" /> Quitar
                                  </Button>
                                </div>
                              </div>
                            </div>
                            {imageUpload.isCover && (
                              <Badge className="absolute -top-2 -right-2 bg-yellow-500 hover:bg-yellow-600 shadow-xs border-none font-bold text-[10px]">
                                PORTADA
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-8">
              <Card className="rounded-2xl shadow-xs border-gray-100 overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b">
                  <CardTitle className="text-lg font-bold">Información del libro</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="title"
                        className="text-xs font-bold uppercase tracking-wider text-gray-500"
                      >
                        Título <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        className="h-12 rounded-xl border-gray-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="author"
                        className="text-xs font-bold uppercase tracking-wider text-gray-500"
                      >
                        Autor(es) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="author"
                        name="author"
                        value={formData.author}
                        onChange={handleInputChange}
                        required
                        className="h-12 rounded-xl border-gray-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="isbn"
                        className="text-xs font-bold uppercase tracking-wider text-gray-500"
                      >
                        ISBN
                      </Label>
                      <Input
                        id="isbn"
                        name="isbn"
                        value={formData.isbn}
                        onChange={handleInputChange}
                        className="h-12 rounded-xl border-gray-100"
                        placeholder="978-XXXXXXXXXX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="publisher"
                        className="text-xs font-bold uppercase tracking-wider text-gray-500"
                      >
                        Editorial
                      </Label>
                      <Input
                        id="publisher"
                        name="publisher"
                        value={formData.publisher}
                        onChange={handleInputChange}
                        className="h-12 rounded-xl border-gray-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="publicationYear"
                        className="text-xs font-bold uppercase tracking-wider text-gray-500"
                      >
                        Año de Pub.
                      </Label>
                      <Input
                        id="publicationYear"
                        name="publicationYear"
                        type="number"
                        value={formData.publicationYear}
                        onChange={handleInputChange}
                        className="h-12 rounded-xl border-gray-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="pages"
                        className="text-xs font-bold uppercase tracking-wider text-gray-500"
                      >
                        Nº Páginas
                      </Label>
                      <Input
                        id="pages"
                        name="pages"
                        type="number"
                        value={formData.pages}
                        onChange={handleInputChange}
                        className="h-12 rounded-xl border-gray-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="location"
                        className="text-xs font-bold uppercase tracking-wider text-gray-500"
                      >
                        Ubicación Física
                      </Label>
                      <Input
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="h-12 rounded-xl border-gray-100"
                      />
                    </div>
                  </div>

                  <Separator className="bg-gray-100" />

                  <div className="space-y-4">
                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Categorías
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {categories.map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50/50 transition-all border border-transparent hover:border-gray-100"
                        >
                          <Checkbox
                            id={`category-${category.id}`}
                            checked={selectedCategories.includes(category.id)}
                            onCheckedChange={() => handleCategoryToggle(category.id)}
                            className="rounded-md h-5 w-5"
                          />
                          <Label
                            htmlFor={`category-${category.id}`}
                            className="text-sm font-semibold text-gray-700 cursor-pointer select-none"
                          >
                            {category.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-gray-100" />

                  <div className="space-y-2">
                    <Label
                      htmlFor="status"
                      className="text-xs font-bold uppercase tracking-wider text-gray-500"
                    >
                      Estado Inicial
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, status: value as BookStatus }))
                      }
                    >
                      <SelectTrigger
                        id="status"
                        className="h-12 rounded-xl border-gray-100 bg-white"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="available">Disponible</SelectItem>
                        <SelectItem value="borrowed">Prestado</SelectItem>
                        <SelectItem value="maintenance">Mantenimiento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="description"
                      className="text-xs font-bold uppercase tracking-wider text-gray-500"
                    >
                      Resumen
                    </Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={6}
                      className="rounded-xl border-gray-100 leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-6">
                    <Button
                      type="button"
                      variant="ghost"
                      asChild
                      className="h-12 px-8 rounded-xl font-bold"
                    >
                      <Link href="/">Descartar</Link>
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="h-12 px-10 rounded-xl font-bold shadow-lg shadow-blue-600/20"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Creando...
                        </>
                      ) : (
                        <>
                          <Save className="h-5 w-5 mr-2" />
                          Registrar Libro
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
