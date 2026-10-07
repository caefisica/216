"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import type { FileRejection } from "react-dropzone";
import { Star, Trash2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { BookFormData } from "../types/book-types";
import { uploadBookImage, cleanupTempFiles } from "@/features/books/actions/editor";
import { Err, isErr } from "@/lib/result";

interface UploadedImage {
  id: string;
  url: string;
  fileName: string;
  isCover: boolean;
  altText: string;
  isUploading: boolean;
  uploadError?: string;
  uploadProgress?: number;
}

interface ExistingImage {
  id: string;
  imageUrl: string;
  isCover: boolean;
  altText?: string | null;
  displayOrder: number | null;
}

interface EditFormProps {
  editForm: BookFormData;
  onFormChange: (field: keyof BookFormData, value: string) => void;
  onSave: (uploadedImages: UploadedImage[]) => void;
  existingImages?: ExistingImage[];
  categories?: Array<{ id: string; name: string }>;
  selectedCategories?: string[];
  onCategoryToggle?: (categoryId: string) => void;
  onImageRemove?: (imageId: string, isExisting: boolean) => void;
  onSetCover?: (imageId: string, isExisting: boolean) => void;
  saving?: boolean;
  userId?: string;
}

export function EditForm({
  editForm,
  onFormChange,
  onSave,
  existingImages = [],
  categories = [],
  selectedCategories = [],
  onCategoryToggle,
  onImageRemove,
  onSetCover,
  saving = false,
}: EditFormProps) {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);

  const handleImageDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        const imageId = `upload_${Date.now()}_${i}`;

        const placeholder: UploadedImage = {
          id: imageId,
          url: "",
          fileName: file.name,
          isCover: existingImages.length === 0 && i === 0,
          altText: "",
          isUploading: true,
          uploadProgress: 0,
        };

        setUploadedImages((prev) => [...prev, placeholder]);

        const formData = new FormData();
        formData.append("file", file);

        const result = await uploadBookImage(formData).catch(() =>
          Err({ code: "failed" as const, message: "Error al subir" }),
        );

        setUploadedImages((prev) =>
          prev.map((img) => {
            if (img.id !== imageId) return img;
            if (isErr(result)) {
              return { ...img, isUploading: false, uploadError: result.error.message };
            }
            return {
              ...img,
              url: result.value.url,
              fileName: result.value.fileName,
              isUploading: false,
              uploadProgress: 100,
            };
          }),
        );
      }
    },
    [existingImages.length],
  );

  const handleImageRejection = useCallback((fileRejections: FileRejection[]) => {
    const rejections: UploadedImage[] = fileRejections.map((rejection, i) => ({
      id: `reject_${Date.now()}_${i}`,
      url: "",
      fileName: rejection.file.name,
      isCover: false,
      altText: "",
      isUploading: false,
      uploadError:
        rejection.errors[0].code === "file-too-large" ? "Archivo muy grande" : "Tipo no válido",
    }));
    setUploadedImages((prev) => [...prev, ...rejections]);
  }, []);

  const handleRemoveUploadedImage = async (imageId: string) => {
    const image = uploadedImages.find((img) => img.id === imageId);
    if (image?.url) {
      await cleanupTempFiles({ fileNames: [image.fileName] });
    }
    setUploadedImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  return (
    <div className="space-y-4 border-t pt-6">
      <h3 className="text-lg font-semibold">Editar información del libro</h3>

      {/* Dropzone */}
      <ImageDropzone
        onDrop={handleImageDrop}
        onRejection={handleImageRejection}
        description="Arrastra imágenes o haz clic para seleccionar"
        className="p-6"
      />

      {/* New Images */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {uploadedImages.map((image) => (
          <div
            key={image.id}
            className="relative aspect-square border rounded-lg overflow-hidden group"
          >
            {image.isUploading ? (
              <div className="flex flex-col items-center justify-center h-full p-2">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400 mb-2" />
                <Progress value={image.uploadProgress} className="h-1 w-full" />
              </div>
            ) : image.uploadError ? (
              <div className="flex flex-col items-center justify-center h-full bg-red-50">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
            ) : (
              <>
                <Image src={image.url} alt="New" fill className="object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveUploadedImage(image.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Existing Images */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {existingImages.map((image) => (
          <div
            key={image.id}
            className="relative aspect-square border rounded-lg overflow-hidden group"
          >
            <Image src={image.imageUrl} alt="Existing" fill className="object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant={image.isCover ? "default" : "secondary"}
                onClick={() => onSetCover?.(image.id, true)}
              >
                <Star className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onImageRemove?.(image.id, true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {image.isCover && (
              <div className="absolute bottom-2 left-2 bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                Portada
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Título</Label>
          <Input
            value={editForm.title || ""}
            onChange={(e) => onFormChange("title", e.target.value)}
          />
        </div>
        <div>
          <Label>Autor</Label>
          <Input
            value={editForm.author || ""}
            onChange={(e) => onFormChange("author", e.target.value)}
          />
        </div>
        <div>
          <Label>ISBN</Label>
          <Input
            value={editForm.isbn || ""}
            onChange={(e) => onFormChange("isbn", e.target.value)}
          />
        </div>
        <div>
          <Label>Editorial</Label>
          <Input
            value={editForm.publisher || ""}
            onChange={(e) => onFormChange("publisher", e.target.value)}
          />
        </div>
        <div>
          <Label>Año de publicación</Label>
          <Input
            type="number"
            value={editForm.publicationYear || ""}
            onChange={(e) => onFormChange("publicationYear", e.target.value)}
          />
        </div>
        <div>
          <Label>Páginas</Label>
          <Input
            type="number"
            value={editForm.pages || ""}
            onChange={(e) => onFormChange("pages", e.target.value)}
          />
        </div>
        <div>
          <Label>Estado</Label>
          <Input
            value={editForm.status || ""}
            onChange={(e) => onFormChange("status", e.target.value)}
          />
        </div>
        <div>
          <Label>Ubicación</Label>
          <Input
            value={editForm.location || ""}
            onChange={(e) => onFormChange("location", e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <Label>Descripción</Label>
          <Textarea
            value={editForm.description || ""}
            onChange={(e) => onFormChange("description", e.target.value)}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-2">
        <Label>Categorías</Label>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Badge
              key={c.id}
              variant={selectedCategories.includes(c.id) ? "default" : "soft"}
              className="cursor-pointer"
              onClick={() => onCategoryToggle?.(c.id)}
            >
              {c.name}
            </Badge>
          ))}
        </div>
      </div>

      <Button
        className="w-full"
        onClick={() => onSave(uploadedImages)}
        disabled={saving || uploadedImages.some((i) => i.isUploading)}
      >
        {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Guardar Libro"}
      </Button>
    </div>
  );
}
