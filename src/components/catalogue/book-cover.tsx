import { cn } from "@/lib/utils";
import Image from "next/image";

const cloths = [
  "bg-cover-1 text-cover-paper",
  "bg-cover-2 text-cover-paper",
  "bg-cover-3 text-cover-paper",
  "bg-cover-4 text-cover-ink",
] as const;

function clothFor(category: string) {
  let hash = 0;
  for (const character of category) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }
  return cloths[Math.abs(hash) % cloths.length];
}

// The shadow's hairline keeps a white or pale cover from melting into the page.
const frame = "relative aspect-cover w-full overflow-hidden rounded-sm shadow-raised";

// A darker band at the left edge reads as the spine of a cloth binding.
const spine =
  "before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-cover-ink/20 before:content-['']";

interface BookCoverProps {
  title: string;
  author?: string | null;
  category?: string;
  imageUrl?: string | null;
  priority?: boolean;
  /** For a thumbnail beside the title: a generated cover is only its initial. */
  compact?: boolean;
  className?: string;
}

/** A photo when the book has one, otherwise a cloth binding coloured by its category. */
export function BookCover({
  title,
  author,
  category = "Biblioteca 216",
  imageUrl,
  priority = false,
  compact = false,
  className,
}: BookCoverProps) {
  if (imageUrl) {
    return (
      <div className={cn(frame, "bg-sunken", className)}>
        <Image
          src={imageUrl}
          alt={compact ? "" : `Portada de ${title}`}
          width={480}
          height={720}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          sizes={compact ? "64px" : "(max-width: 640px) 160px, 224px"}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  if (compact) {
    return (
      <div
        aria-hidden
        className={cn(frame, spine, clothFor(category), "grid place-items-center", className)}
      >
        <span className="pl-2 text-xl font-semibold">{title.match(/\p{L}|\d/u)?.[0]}</span>
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`Portada generada de ${title}`}
      className={cn(frame, spine, clothFor(category), className)}
    >
      <div className="absolute inset-0 flex flex-col gap-3 py-4 pr-3 pl-5">
        <p className="line-clamp-6 text-base font-semibold hyphens-auto break-words">{title}</p>
        <span className="h-px w-8 shrink-0 bg-current opacity-50" />
        {author && <p className="mt-auto line-clamp-2 text-xs">{author}</p>}
      </div>
    </div>
  );
}
