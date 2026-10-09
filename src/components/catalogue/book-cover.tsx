import { cn } from "@/lib/utils";
import Image from "next/image";

const palettes = [
  "bg-cover-1 text-cover-1-foreground",
  "bg-cover-2 text-cover-2-foreground",
  "bg-cover-3 text-cover-3-foreground",
  "bg-cover-4 text-cover-4-foreground",
  "bg-cover-5 text-cover-5-foreground",
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
  className?: string;
}

export function BookCover({
  title,
  author,
  category = "Biblioteca 216",
  imageUrl,
  priority = false,
  className,
}: BookCoverProps) {
  const frame = cn("relative aspect-[2/3] w-full overflow-hidden rounded-sm", className);

  if (imageUrl) {
    return (
      <div className={cn(frame, "bg-surface-muted")}>
        <Image
          src={imageUrl}
          alt={`Portada de ${title}`}
          width={480}
          height={720}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      role="img"
      className={cn(frame, paletteFor(category), "flex flex-col justify-between p-4 sm:p-5")}
      aria-label={`Portada generada de ${title}`}
    >
      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] opacity-65">
        Biblioteca 216
      </span>
      <div>
        <p className="line-clamp-5 font-serif text-[clamp(1rem,3vw,1.55rem)] font-semibold leading-[1.08] tracking-tight">
          {title}
        </p>
        {author && <p className="mt-3 line-clamp-2 text-xs font-medium opacity-75">{author}</p>}
      </div>
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] opacity-60">
        {category}
      </span>
    </div>
  );
}
