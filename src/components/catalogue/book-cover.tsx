import { cn } from "@/lib/utils";
import Image from "next/image";

const palettes = [
  "bg-cover-1 text-cover-1-foreground",
  "bg-cover-2 text-cover-2-foreground",
  "bg-cover-3 text-cover-3-foreground",
  "bg-cover-4 text-cover-4-foreground",
] as const;

function paletteFor(category: string) {
  let hash = 0;
  for (const character of category) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }
  return palettes[Math.abs(hash) % palettes.length];
}

interface BookCoverProps {
  title: string;
  author?: string | null;
  category?: string;
  imageUrl?: string | null;
  priority?: boolean;
  /** For a thumbnail beside the title: a generated cover is only a coloured initial. */
  compact?: boolean;
  className?: string;
}

/** A photo when the book has one, otherwise a typeset cover coloured by its category. */
export function BookCover({
  title,
  author,
  category = "Biblioteca 216",
  imageUrl,
  priority = false,
  compact = false,
  className,
}: BookCoverProps) {
  const frame = cn("relative aspect-[2/3] w-full overflow-hidden rounded-sm", className);

  if (imageUrl) {
    return (
      <div className={cn(frame, "bg-sunken")}>
        <Image
          src={imageUrl}
          alt={`Portada de ${title}`}
          width={480}
          height={720}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          sizes="(max-width: 640px) 96px, 240px"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  if (compact) {
    return (
      <div
        aria-hidden
        className={cn(frame, paletteFor(category), "flex items-center justify-center")}
      >
        <span className="font-serif text-xl font-semibold">{title.match(/\p{L}|\d/u)?.[0]}</span>
      </div>
    );
  }

  return (
    <div
      role="img"
      className={cn(frame, paletteFor(category), "@container")}
      aria-label={`Portada generada de ${title}`}
    >
      <div className="absolute inset-0 flex flex-col justify-between p-[clamp(0.375rem,8cqi,1.25rem)]">
        <p className="line-clamp-5 font-serif text-[clamp(0.7rem,12cqi,1.5rem)] font-semibold leading-[1.1] break-words">
          {title}
        </p>
        {author && (
          <p className="line-clamp-2 text-[clamp(0.6rem,6cqi,0.75rem)] opacity-75">{author}</p>
        )}
      </div>
    </div>
  );
}
