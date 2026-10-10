"use client";

import { useState } from "react";
import Image from "next/image";
import { BookCover } from "@/components/catalogue/book-cover";
import { cn } from "@/lib/utils";

interface BookGalleryProps {
  images: { id: string; imageUrl: string }[];
  title: string;
  author: string | null;
  category: string;
}

export function BookGallery({ images, title, author, category }: BookGalleryProps) {
  const [current, setCurrent] = useState(0);

  return (
    <div className="grid gap-2">
      <BookCover
        title={title}
        author={author}
        category={category}
        imageUrl={images[current]?.imageUrl}
        priority
      />
      {images.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              aria-label={`Ver foto ${index + 1} de ${images.length}`}
              aria-pressed={index === current}
              onClick={() => setCurrent(index)}
              className={cn(
                "relative size-control overflow-hidden rounded-sm border-2",
                index === current ? "border-foreground" : "border-transparent",
              )}
            >
              <Image
                src={image.imageUrl}
                alt=""
                width={48}
                height={72}
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
