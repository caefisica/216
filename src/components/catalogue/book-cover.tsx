import { cn } from "@/lib/utils";
import Image from "next/image";

const cloths = [
  "bg-cover-1 text-cover-light",
  "bg-cover-2 text-cover-light",
  "bg-cover-3 text-cover-light",
  "bg-cover-4 text-cover-dark",
] as const;

function clothFor(category: string) {
  let hash = 0;
  for (const character of category) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }
  return cloths[Math.abs(hash) % cloths.length];
}

// The hairline keeps a white or pale cover from melting into the page.
const frame =
  "relative aspect-[2/3] w-full overflow-hidden rounded-xs shadow-cover after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)] after:content-['']";

// Shading at the left edge reads as the spine of a cloth binding.
const spine =
  "before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-[8%] before:bg-[linear-gradient(90deg,rgb(0_0_0/0.28),rgb(255_255_255/0.1)_70%,transparent)] before:content-['']";

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
        <span className="pl-[8%] font-serif text-2xl font-medium">
          {title.match(/\p{L}|\d/u)?.[0]}
        </span>
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`Portada generada de ${title}`}
      className={cn(frame, spine, clothFor(category), "@container", className)}
    >
      <div className="absolute inset-0 flex flex-col py-[10cqi] pr-[9cqi] pl-[15cqi]">
        <p className="line-clamp-8 font-serif text-[clamp(0.75rem,11cqi,1.75rem)] leading-[1.12] font-medium hyphens-auto break-words">
          {title}
        </p>
        <span className="mt-[7cqi] h-px w-[18cqi] shrink-0 bg-current opacity-50" />
        {author && (
          <p className="mt-auto line-clamp-2 text-[clamp(0.625rem,6.5cqi,0.875rem)] leading-snug">
            {author}
          </p>
        )}
      </div>
    </div>
  );
}
