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
}: {
  playlist: PlaylistCardData;
  href: string;
}) {
  const count = playlist._count.items;
  return (
    <Link
      href={href}
      className="group block bg-card border border-border/60 rounded-lg overflow-hidden hover:border-orange-500/30 transition-colors"
    >
      <div className="relative h-40 bg-secondary overflow-hidden">
        {playlist.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={playlist.coverImage}
            alt={playlist.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-orange-600/15 to-amber-500/20 flex items-center justify-center">
            <ListVideo className="w-12 h-12 text-orange-500/30" />
          </div>
        )}
        {/* YouTube-style stacked count badge */}
        <div className="absolute bottom-0 right-0 h-full w-[38%] bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center text-white">
          <ListVideo className="w-5 h-5 mb-1 opacity-80" />
          <span className="text-xs font-semibold">
            {count} course{count !== 1 ? "s" : ""}
          </span>
        </div>
        {playlist.visibility === "PRIVATE" && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-black/60 text-amber-300 border border-amber-400/30">
            <Lock className="w-3 h-3" /> Private
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-[15px] line-clamp-1 group-hover:text-orange-500 transition-colors">
          {playlist.title}
        </h3>
        {playlist.owner?.name && (
          <p className="text-muted-foreground/60 text-xs mt-0.5">
            by {playlist.owner.name}
          </p>
        )}
        {playlist.description && (
          <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2 mt-2">
            {truncate(playlist.description, 110)}
          </p>
        )}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground/70">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> {count}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {formatMinutes(playlist.totalDuration ?? 0)}
          </span>
          {playlist._count.followers > 0 && (
            <span className="flex items-center gap-1">
              <Bookmark className="w-3 h-3" /> {playlist._count.followers}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
