"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
      toast({ title: "Fotos agregadas" });
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
    toast({ title: "Foto eliminada" });
    router.refresh();
  };

  return (
    <section aria-labelledby="fotos" className="grid gap-3">
      <h2 id="fotos" className="text-lg font-semibold">
        Fotos ({images.length})
      </h2>
      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {images.map((image) => (
            <li key={image.id} className="grid gap-2">
              <div className="relative aspect-3/4 overflow-hidden rounded-sm border bg-sunken">
                <Image src={image.imageUrl} alt="" fill sizes="160px" className="object-cover" />
              </div>
              <div className="flex gap-1">
                <Button
                  variant="secondary"
                  className="flex-1 px-2"
                  disabled={image.isCover}
                  onClick={() => makeCover(image.id)}
                >
                  {image.isCover ? "Portada" : "Usar de portada"}
                </Button>
                <Button variant="quiet" className="px-2" onClick={() => remove(image.id)}>
                  Quitar<span className="sr-only"> foto</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
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
          label={uploading ? "Subiendo…" : "Añadir fotos"}
        />
      </div>
    </section>
  );
}
