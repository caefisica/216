"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookCover } from "@/components/catalogue/book-cover";
import { Heart } from "lucide-react";
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
      <Card className="group border-border transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
        <CardContent className="p-0">
          <div className="relative overflow-hidden rounded-t-lg">
            <BookCover
              title={book.title}
              author={book.author}
              category={book.category.name}
              imageUrl={book.imageUrl}
              priority={priority}
              className="rounded-t-lg transition-transform duration-200 group-hover:scale-105"
            />
            <div className="absolute left-3 top-3">
              <Badge
                className={
                  available
                    ? "border-status-available/30 bg-status-available/10 text-status-available"
                    : "border-border bg-surface text-muted-foreground"
                }
                variant="outline"
              >
                {availabilityLabel(book.lendableCount, book.copyCount)}
              </Badge>
            </div>
            <div className="absolute right-3 top-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleHeart}
                aria-label={isHearted ? "Quitar de favoritos" : "Añadir a favoritos"}
                className={`h-8 w-8 bg-surface/90 p-0 transition-all duration-200 hover:bg-surface ${
                  isHearted
                    ? "text-status-favorite hover:text-status-favorite"
                    : "text-muted-foreground hover:text-status-favorite"
                }`}
              >
                <Heart
                  className={`h-4 w-4 transition-all duration-200 ${isHearted ? "fill-current scale-110" : ""}`}
                />
              </Button>
            </div>
          </div>

          <div className="space-y-2 p-4">
            {book.imageUrl && (
              <>
                <h3 className="line-clamp-2 text-sm font-semibold leading-tight transition-colors duration-200 group-hover:text-primary">
                  {book.title}
                </h3>
                {book.author && <p className="text-sm text-muted-foreground">{book.author}</p>}
              </>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
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
