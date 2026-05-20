"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Clock, PlayCircle, Loader2 } from "lucide-react";
import { formatMinutes } from "@/lib/utils";

interface Item {
  id: string;
  order: number;
  course: {
    id: string;
    title: string;
    thumbnail: string | null;
    level: string;
    isFree: boolean;
    price: number | null;
    discountPrice: number | null;
    totalLessons: number;
    totalDuration: number;
    status: string;
    createdBy: { name: string };
  };
}

export default function PlaylistItemsList({
  playlistId,
  total,
}: {
  playlistId: string;
  total: number;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const next = page + 1;
      const res = await fetch(
        `/api/playlists/${playlistId}/courses?page=${next}`,
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems((prev) => [...prev, ...data.items]);
      setPage(next);
      setHasMore(data.hasMore);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, playlistId]);

  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  if (total === 0) {
    return (
      <div className="glass p-10 rounded-xl text-center">
        <BookOpen className="w-12 h-12 text-orange-500/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          This list doesn&apos;t have any courses yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((it, i) => {
        const c = it.course;
        const unavailable = c.status !== "PUBLISHED";
        const inner = (
          <div
            className={`flex gap-3 p-3 bg-card border border-border rounded-lg transition-all ${
              unavailable
                ? "opacity-50"
                : "hover:border-orange-500/30 group"
            }`}
          >
            <span className="text-sm font-bold text-muted-foreground/60 w-6 text-center self-center tabular-nums">
              {i + 1}
            </span>
            <div className="relative flex-shrink-0 w-32 h-20 rounded-md overflow-hidden bg-secondary">
              {c.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.thumbnail} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-500/20 to-amber-500/10">
                  <BookOpen className="w-7 h-7 text-orange-500/30" />
                </div>
              )}
              {!unavailable && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <PlayCircle className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 self-center">
              <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-orange-500 transition-colors">
                {c.title}
              </h3>
              <p className="text-muted-foreground/55 text-xs mt-0.5">
                by {c.createdBy.name}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground/60">
                <span className="capitalize">{c.level}</span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {c.totalLessons} lesson{c.totalLessons !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatMinutes(c.totalDuration)}
                </span>
                {unavailable && (
                  <span className="text-amber-500">Unavailable</span>
                )}
              </div>
            </div>
          </div>
        );
        return unavailable ? (
          <div key={it.id}>{inner}</div>
        ) : (
          <Link key={it.id} href={`/courses/${c.id}`}>
            {inner}
          </Link>
        );
      })}

      <div ref={sentinel} />
      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {!hasMore && items.length > 0 && (
        <p className="text-center text-xs text-muted-foreground/50 py-4">
          End of list · {items.length} course{items.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
