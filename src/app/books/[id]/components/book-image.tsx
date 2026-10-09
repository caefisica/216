"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookCover } from "@/components/catalogue/book-cover";

interface BookImageProps {
  images?: Array<{ imageUrl: string; altText?: string | null; isCover?: boolean }>;
  title?: string;
  author?: string | null;
  category?: string;
}

export function BookImage({ images = [], title = "Book cover", author, category }: BookImageProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <BookCover
        title={title}
        author={author}
        category={category}
        className="mx-auto mb-6 max-w-[15rem] lg:max-w-none"
        priority
      />
    );
  }

  if (images.length === 1) {
    return (
      <BookCover
        title={title}
        author={author}
        category={category}
        imageUrl={images[0].imageUrl}
        className="mx-auto mb-6 max-w-[15rem] lg:max-w-none"
        priority
      />
    );
  }

  // Multiple images - show carousel
  return (
    <div className="mx-auto mb-6 max-w-[15rem] space-y-2 lg:max-w-none">
      <div className="relative">
        <BookCover
          title={title}
          author={author}
          category={category}
          imageUrl={images[currentImageIndex].imageUrl}
          priority
        />

        {/* Navigation arrows */}
        <div className="absolute inset-0 flex items-center justify-between p-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 rounded-full opacity-70 hover:opacity-100"
            onClick={() =>
              setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
            }
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Anterior</span>
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 rounded-full opacity-70 hover:opacity-100"
            onClick={() =>
              setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
            }
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Siguiente</span>
          </Button>
        </div>

        <div className="absolute bottom-2 right-2 rounded bg-foreground/80 px-2 py-1 text-xs text-background">
          {currentImageIndex + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnail navigation */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {images.map((image, index) => (
          <button
            key={index}
            className={`relative h-16 w-12 shrink-0 overflow-hidden rounded border-2 ${
              index === currentImageIndex ? "border-primary" : "border-transparent"
            }`}
            onClick={() => setCurrentImageIndex(index)}
          >
            <Image
              src={image.imageUrl}
              alt={image.altText || `Miniatura ${index + 1}`}
              width={48}
              height={72}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            {image.isCover && (
              <div className="absolute bottom-0 left-0 right-0 bg-primary/90 text-center text-[8px] text-primary-foreground">
                Portada
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
