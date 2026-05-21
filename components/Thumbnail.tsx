import Image from "next/image";
import Link from "next/link";
import { ImageIcon, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThumbnailProps {
  src?: string | null;
  alt: string;
  href?: string;
  /** Optional badge text shown at top-right, e.g. "NEW", "HD". */
  badge?: string;
  /** Duration label rendered bottom-right (YouTube style), e.g. "12:34". */
  duration?: string;
  /** Title rendered as a gradient overlay (Netflix style). */
  title?: string;
  /** Show a centered play icon that fades in on hover. */
  showPlayIcon?: boolean;
  /** Use eager loading + priority for above-the-fold thumbnails. */
  priority?: boolean;
  /** Responsive `sizes` attribute forwarded to next/image. */
  sizes?: string;
  className?: string;
  onClick?: () => void;
}

/**
 * Modern 16:9 image thumbnail inspired by YouTube and Netflix.
 *
 * The image always fully covers the fixed-ratio frame via `object-cover`
 * with centered cropping, so it fills the area without distortion.
 */
export default function Thumbnail({
  src,
  alt,
  href,
  badge,
  duration,
  title,
  showPlayIcon = false,
  priority = false,
  sizes = "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw",
  className,
  onClick,
}: ThumbnailProps) {
  const content = (
    <div
      className={cn(
        "group relative aspect-video w-full overflow-hidden rounded-xl bg-secondary",
        "ring-1 ring-border/60 shadow-sm",
        "transition-all duration-300 ease-out",
        "hover:shadow-xl hover:ring-orange-500/40 hover:-translate-y-0.5",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-500/15 via-orange-600/10 to-amber-500/15">
          <ImageIcon className="h-10 w-10 text-orange-500/40" aria-hidden />
        </div>
      )}

      {/* Bottom gradient — strengthens on hover (Netflix-style reveal). */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent",
          "opacity-60 transition-opacity duration-300 group-hover:opacity-90",
        )}
      />

      {badge && (
        <span className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          {badge}
        </span>
      )}

      {duration && (
        <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white tabular-nums">
          {duration}
        </span>
      )}

      {showPlayIcon && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm">
            <Play className="ml-0.5 h-6 w-6 fill-black text-black" aria-hidden />
          </div>
        </div>
      )}

      {title && (
        <h3 className="absolute inset-x-0 bottom-0 line-clamp-2 px-3 pb-3 pt-6 text-sm font-semibold text-white drop-shadow-md sm:text-base">
          {title}
        </h3>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} aria-label={alt} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 rounded-xl">
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={alt} className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 rounded-xl">
        {content}
      </button>
    );
  }

  return content;
}
