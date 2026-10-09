"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import { toast, toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import { addBookImage, deleteBookImage, setCoverImage, uploadBookImage } from "../actions";
import type { BookImage } from "../types";

interface ImageManagerProps {
  bookId: string;
  images: BookImage[];
}

export function ImageManager({ bookId, images }: ImageManagerProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  const upload = async (files: File[]) => {
    setUploading(true);
    try {
      for (const [index, file] of files.entries()) {
        const form = new FormData();
        form.append("file", file);
        const uploaded = await uploadBookImage(form);
        if (isErr(uploaded)) {
          toastActionError(uploaded.error);
          return;
        }
        const added = await addBookImage({
          bookId,
          imageUrl: uploaded.value.url,
          isCover: images.length === 0 && index === 0,
          displayOrder: images.length + index,
        });
        if (isErr(added)) {
          toastActionError(added.error);
          return;
        }
      }
      toast({ title: "Imágenes agregadas" });
    } finally {
      setUploading(false);
      router.refresh();
    }
  };

  const makeCover = async (imageId: string) => {
    const result = await setCoverImage({ imageId, bookId });
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    toast({ title: "Portada actualizada" });
    router.refresh();
  };

  const remove = async (imageId: string) => {
    const result = await deleteBookImage({ imageId, bookId });
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    toast({ title: "Imagen eliminada" });
    router.refresh();
  };

  return (
    <div className="surface space-y-3 p-5 sm:p-8">
      <h2 className="text-lg font-semibold">Imágenes ({images.length})</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {images.map((image) => (
          <div key={image.id} className="space-y-2">
            <div className="relative aspect-3/4 overflow-hidden rounded border border-border bg-surface-muted">
              <Image src={image.imageUrl} alt="" fill className="object-cover" />
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={image.isCover ? "secondary" : "outline"}
                className="flex-1"
                disabled={image.isCover}
                onClick={() => makeCover(image.id)}
              >
                <Star className="mr-1 h-3 w-3" />
                {image.isCover ? "Portada" : "Usar de portada"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                aria-label="Eliminar imagen"
                onClick={() => remove(image.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
        <div className="relative">
          <ImageDropzone
            onDrop={upload}
            onRejection={() =>
              toast({
                title: "Archivo rechazado",
                description: "Sube solo imágenes JPEG, PNG o WebP.",
                variant: "destructive",
              })
            }
            label="Subir imágenes"
            className="aspect-3/4 p-4"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/70">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
