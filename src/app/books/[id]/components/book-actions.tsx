"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Heart, BookOpen } from "lucide-react";
import type { BookDetailed } from "@/features/books/types";

interface BookActionsProps {
  book: BookDetailed;
  isHearted: boolean;
  heartsCount: number;
  onHeart: () => void;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  borrowNote: string;
  setBorrowNote: (note: string) => void;
  borrowing: boolean;
  onBorrowRequest: () => void;
}

export function BookActions({
  book,
  isHearted,
  heartsCount,
  onHeart,
  dialogOpen,
  setDialogOpen,
  borrowNote,
  setBorrowNote,
  borrowing,
  onBorrowRequest,
}: BookActionsProps) {
  return (
    <div className="surface space-y-3 p-3">
      <Button
        variant="ghost"
        onClick={onHeart}
        className={`w-full ${isHearted ? "border-status-favorite/30 text-status-favorite" : ""}`}
      >
        <Heart className={`h-4 w-4 mr-2 ${isHearted ? "fill-current" : ""}`} />
        {isHearted ? "Te gusta" : "Me gusta"} ({heartsCount})
      </Button>

      {book.lendableCount === 0 && (
        <p className="px-2 text-center text-sm text-muted-foreground">
          Ningún ejemplar está disponible ahora.
        </p>
      )}

      {book.lendableCount > 0 && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <BookOpen className="h-4 w-4 mr-2" />
              Solicitar préstamo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar préstamo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="note">Nota (opcional)</Label>
                <Textarea
                  id="note"
                  placeholder="Cualquier nota adicional para el bibliotecario..."
                  value={borrowNote}
                  onChange={(e) => setBorrowNote(e.target.value)}
                  className="mt-2"
                />
              </div>
              <Button onClick={onBorrowRequest} disabled={borrowing} className="w-full">
                {borrowing ? "Enviando..." : "Enviar solicitud"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
