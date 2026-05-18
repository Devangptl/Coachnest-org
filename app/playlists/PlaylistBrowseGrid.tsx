"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import PlaylistCard, {
  type PlaylistCardData,
} from "@/components/playlists/PlaylistCard";

export default function PlaylistBrowseGrid() {
  const [q, setQ] = useState("");
  const [playlists, setPlaylists] = useState<PlaylistCardData[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchPage = useCallback(
    async (nextPage: number, replace: boolean) => {
      if (loading) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(nextPage) });
        if (q) params.set("q", q);
        const res = await fetch(`/api/playlists?${params}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setPlaylists((prev) =>
          replace ? data.playlists : [...prev, ...data.playlists],
        );
        setPage(data.page);
        setHasMore(data.hasMore);
      } catch {
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [q, loading],
  );

  // Search (debounced) — resets the list.
  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setPlaylists([]);
      setPage(0);
      setHasMore(true);
      fetchPage(1, true);
    }, 300);
    return () => clearTimeout(debounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && page > 0) {
          fetchPage(page + 1, false);
        }
      },
      { rootMargin: "300px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchPage, hasMore, loading, page]);

  return (
    <div>
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          className="input-glass pl-9 w-full"
          placeholder="Search course lists…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {!loading && playlists.length === 0 ? (
        <div className="glass p-12 rounded-xl text-center">
          <p className="text-muted-foreground">
            {q ? "No lists match your search." : "No public course lists yet."}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((p) => (
            <PlaylistCard
              key={p.id}
              href={`/playlists/${p.slug}`}
              playlist={p}
            />
          ))}
        </div>
      )}

      <div ref={sentinel} />
      {loading && (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
