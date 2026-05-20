import Link from "next/link";
import { ListVideo, BookOpen, Clock, Bookmark, Lock } from "lucide-react";
import { formatMinutes, truncate } from "@/lib/utils";

export interface PlaylistCardData {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  owner?: { name: string } | null;
  totalDuration?: number;
  _count: { items: number; followers: number };
}

export default function PlaylistCard({
  playlist,
  href,
  compact = false,
}: {
  playlist: PlaylistCardData;
  href: string;
  compact?: boolean;
}) {
  const count = playlist._count.items;

  return (
    <Link href={href} className="group block h-full">
      <div className="relative bg-card border border-border/60 rounded-md overflow-hidden transition-colors duration-300 group-hover:border-orange-500/30 h-full flex flex-col">
        {/* Top orange accent line */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-orange-600 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />

        {/* Thumbnail */}
        <div
          className={`relative ${compact ? "h-[100px]" : "h-40"} bg-secondary overflow-hidden flex-shrink-0`}
        >
          {playlist.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={playlist.coverImage}
              alt={playlist.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-orange-600/15 to-amber-500/20 flex items-center justify-center">
              <ListVideo
                className={`${compact ? "w-7 h-7" : "w-12 h-12"} text-orange-500/30`}
              />
            </div>
          )}

          {/* YouTube-style stacked count badge */}
          <div className="absolute bottom-0 right-0 h-full w-[38%] bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center text-white">
            <ListVideo
              className={`${compact ? "w-4 h-4 mb-0.5" : "w-5 h-5 mb-1"} opacity-80`}
            />
            <span className={`font-semibold ${compact ? "text-[10px]" : "text-xs"}`}>
              {count} course{count !== 1 ? "s" : ""}
            </span>
          </div>

          {playlist.visibility === "PRIVATE" && (
            <span
              className={`absolute top-2 left-2 inline-flex items-center gap-1 font-semibold uppercase rounded-full bg-black/60 text-amber-300 border border-amber-400/30 ${
                compact ? "text-[8px] px-1.5 py-px" : "text-[10px] px-2 py-0.5"
              }`}
            >
              <Lock className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} /> Private
            </span>
          )}
        </div>

        {/* Content */}
        <div className={`${compact ? "p-2" : "p-4"} flex-1 flex flex-col`}>
          <h3
            className={`text-foreground font-semibold line-clamp-1 group-hover:text-orange-500 transition-colors leading-snug ${
              compact ? "text-[11px]" : "text-[15px]"
            }`}
          >
            {playlist.title}
          </h3>

          {!compact && playlist.owner?.name && (
            <p className="text-muted-foreground/60 text-xs mt-0.5">
              by {playlist.owner.name}
            </p>
          )}

          {!compact && playlist.description && (
            <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2 mt-2 flex-1">
              {truncate(playlist.description, 110)}
            </p>
          )}

          <div
            className={`flex items-center gap-3 text-muted-foreground/70 ${
              compact
                ? "mt-1.5 text-[10px]"
                : "mt-3 pt-3 border-t border-border/50 text-xs"
            }`}
          >
            <span className="flex items-center gap-1">
              <BookOpen className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} /> {count}
            </span>
            <span className="flex items-center gap-1">
              <Clock className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />{" "}
              {formatMinutes(playlist.totalDuration ?? 0)}
            </span>
            {playlist._count.followers > 0 && (
              <span className="flex items-center gap-1">
                <Bookmark className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />{" "}
                {playlist._count.followers}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
