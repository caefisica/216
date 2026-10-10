"use client";

import * as React from "react";
import { useDropzone, type FileRejection, type DropzoneOptions } from "react-dropzone";
import { ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageDropzoneProps extends Omit<DropzoneOptions, "onDrop"> {
  onDrop: (acceptedFiles: File[]) => void;
  onRejection?: (fileRejections: FileRejection[]) => void;
  className?: string;
  label?: string;
}

export function ImageDropzone({
  onDrop,
  onRejection,
  className,
  label = "Añadir fotos",
  accept = { "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"] },
  maxSize = 5 * 1024 * 1024,
  multiple = true,
  ...props
}: ImageDropzoneProps) {
  const handleDrop = React.useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      onDrop(acceptedFiles);
      if (fileRejections.length > 0 && onRejection) {
        onRejection(fileRejections);
      }
    },
    [onDrop, onRejection],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept,
    maxSize,
    multiple,
    ...props,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex min-h-control cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-sunken",
        isDragActive && "bg-sunken text-foreground",
        className,
      )}
    >
      <input {...getInputProps()} />
      <ImagePlus aria-hidden className="size-4" />
      {isDragActive ? "Suelta aquí" : `${label} (JPG, PNG o WebP, hasta 5 MB)`}
    </div>
  );
}
