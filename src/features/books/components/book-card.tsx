"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart } from "lucide-react";
import { getPlaceholderUrl } from "@/lib/placeholders";
import { availabilityLabel } from "../labels";
import type { BookListItem } from "../types";

interface BookCardProps {
  book: BookListItem;
  isHearted: boolean;
  onToggleHeart: (e: React.MouseEvent) => void;
  priority?: boolean;
}

export function BookCard({ book, isHearted, onToggleHeart, priority }: BookCardProps) {
  const available = book.lendableCount > 0;

  return (
    <Link href={`/books/${book.id}`}>
      <Card className="group hover:shadow-lg transition-all duration-300 border-gray-200 hover:border-gray-300 hover:-translate-y-1">
        <CardContent className="p-0">
          <div className="relative aspect-3/4 overflow-hidden rounded-t-lg">
            <Image
              src={book.imageUrl || getPlaceholderUrl(300, 400)}
              alt={book.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              priority={priority}
            />
            <div className="absolute top-3 left-3">
              <Badge
                className={
                  available
                    ? "bg-green-100 text-green-800 border-green-200"
                    : "bg-gray-100 text-gray-800 border-gray-200"
                }
                variant="outline"
              >
                {availabilityLabel(book.lendableCount, book.copyCount)}
              </Badge>
            </div>
            <div className="absolute top-3 right-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleHeart}
                aria-label={isHearted ? "Quitar de favoritos" : "Añadir a favoritos"}
                className={`h-8 w-8 p-0 bg-white/90 hover:bg-white transition-all duration-200 ${
                  isHearted ? "text-red-500 hover:text-red-600" : "text-gray-600 hover:text-red-500"
                }`}
              >
                <Heart
                  className={`h-4 w-4 transition-all duration-200 ${isHearted ? "fill-current scale-110" : ""}`}
                />
              </Button>
            </div>
          </div>

          <div className="p-4 space-y-2">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors duration-200">
              {book.title}
            </h3>
            {book.author && <p className="text-sm text-gray-600">{book.author}</p>}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <Badge variant="secondary" className="text-xs">
                {book.category.name}
              </Badge>
              <span className="font-mono">{book.code}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
