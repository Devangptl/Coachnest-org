"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import PlaylistCard, {
  type PlaylistCardData,
} from "@/components/playlists/PlaylistCard";
import {
  SlidersHorizontal, X, ListVideo, Search, ArrowUpDown,
  AlertCircle, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const SORT_OPT = [
  { value: "newest",  label: "Newest" },
  { value: "popular", label: "Most Followed" },
  { value: "largest", label: "Most Courses" },
];

// ─── Filter panel content (shared by sidebar + drawer) ────────────────────────
function FilterContent({
  sort, setSort,
  hasActiveFilters,
  clearFilters,
  isMobile = false,
}: {
  sort: string; setSort: (v: string) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  isMobile?: boolean;
}) {
  const optionCls = (active: boolean) => cn(
    "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border",
    isMobile && "text-center",
    active
      ? "bg-orange-500/15 text-[#d97757] border-[#d97757]/25 font-medium"
      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/70"
  );

  return (
    <div className={cn("space-y-6", isMobile && "pb-4")}>
      <div>
        <h4 className="text-muted-foreground/60 text-[10px] font-bold uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
          <ArrowUpDown className="w-3 h-3" /> Sort by
        </h4>
        <div className={cn("gap-1.5", isMobile ? "grid grid-cols-2" : "space-y-1")}>
          {SORT_OPT.map((opt) => (
            <button key={opt.value} onClick={() => setSort(opt.value)} className={optionCls(sort === opt.value)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-all border border-dashed border-border/60 hover:border-border"
        >
          <X className="w-3.5 h-3.5" />
          Clear all filters
        </button>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function PlaylistBrowseGrid() {
  const sp     = useSearchParams();
  const router = useRouter();

  const [query,     setQuery]     = useState(sp.get("q")    ?? "");
  const [sort,      setSort]      = useState(sp.get("sort") ?? "newest");
  const [page,      setPage]      = useState(1);
  const [playlists, setPlaylists] = useState<PlaylistCardData[]>([]);
  const [total,     setTotal]     = useState(0);
  const [pages,     setPages]     = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [sideOpen,  setSideOpen]  = useState(false);
  const [isMobile,  setIsMobile]  = useState(false);

  const abortRef    = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track viewport for mobile/desktop filter treatment
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (!e.matches) setSideOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobile && sideOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, sideOpen]);

  const fetchPlaylists = useCallback(
    async (opts: { reset?: boolean; q?: string; pg?: number } = {}) => {
      const { reset = false, q = query, pg = reset ? 1 : page } = opts;

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      if (reset) setPage(1);
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        ...(q && { q }),
        sort,
        page: String(pg),
      });

      const urlParams = new URLSearchParams();
      if (q)               urlParams.set("q",    q);
      if (sort !== "newest") urlParams.set("sort", sort);
      router.replace(`/playlists${urlParams.toString() ? `?${urlParams}` : ""}`, { scroll: false });

      try {
        const res = await fetch(`/api/playlists?${params}`, { signal: abortRef.current.signal });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const data = await res.json();
        setPlaylists(data.playlists ?? []);
        setTotal(data.total      ?? 0);
        setPages(data.totalPages ?? 1);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError("Something went wrong. Please try again.");
        setPlaylists([]);
        setTotal(0);
        setPages(1);
      } finally {
        setLoading(false);
      }
    },
    [query, sort, page, router],
  );

  // Initial fetch
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      fetchPlaylists({ reset: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when sort changes
  const prevSortRef = useRef(sort);
  useEffect(() => {
    if (prevSortRef.current !== sort) {
      prevSortRef.current = sort;
      fetchPlaylists({ reset: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  // Re-fetch when page changes
  const prevPageRef = useRef(page);
  useEffect(() => {
    if (prevPageRef.current !== page) {
      prevPageRef.current = page;
      fetchPlaylists({ pg: page });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const hasActiveFilters = sort !== "newest";
  const activeFilterCount = hasActiveFilters ? 1 : 0;

  function clearFilters() { setSort("newest"); }

  function handleQueryChange(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPlaylists({ reset: true, q }), 350);
  }

  const filterProps = { sort, setSort, hasActiveFilters, clearFilters };

  return (
    <div className="pt-4 pb-32">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <ListVideo className="w-5 h-5 text-orange-500" />
          {query
            ? <><span className="text-muted-foreground/50 font-medium">Lists for </span><span className="text-[#d97757]">"{query}"</span></>
            : "Course Lists"
          }
        </h1>
        <p className="text-sm text-muted-foreground/50 mt-0.5">
          {loading
            ? "Loading…"
            : error
              ? "Something went wrong"
              : `${total.toLocaleString()} list${total !== 1 ? "s" : ""} found`}
        </p>
      </div>

      {/* ── Active filter chips ──────────────────────────────────────────── */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 flex-wrap mb-4 overflow-hidden"
          >
            <span className="text-[11px] text-muted-foreground/40 font-medium">Active:</span>
            <motion.button
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
              onClick={() => setSort("newest")}
              className="flex items-center gap-1 text-xs bg-orange-500/10 text-[#d97757] border border-[#d97757]/20 rounded-full px-2.5 py-1 hover:bg-orange-500/20 transition-colors"
            >
              <ArrowUpDown className="w-2.5 h-2.5" />
              {SORT_OPT.find((o) => o.value === sort)?.label}
              <X className="w-3 h-3" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Layout: sidebar + results ────────────────────────────────────── */}
      <div className="flex gap-6">

        {/* Desktop inline sidebar */}
        <AnimatePresence>
          {sideOpen && !isMobile && (
            <motion.aside
              initial={{ opacity: 0, x: -16, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 240 }}
              exit={{ opacity: 0, x: -16, width: 0 }}
              transition={{ duration: 0.2 }}
              className="hidden lg:block flex-shrink-0 overflow-hidden"
            >
              <div className="rounded-xl border border-border/60 bg-card p-4 w-[240px] sticky top-20">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground/50" />
                    <h3 className="text-sm font-semibold text-foreground/80">Filters</h3>
                  </div>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-[11px] text-muted-foreground/40 hover:text-[#d97757] transition-colors font-medium flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Reset
                    </button>
                  )}
                </div>
                <div className="h-px bg-border/50 mb-3.5" />
                <FilterContent {...filterProps} />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Results column */}
        <div className="flex-1 min-w-0">
          {/* Error banner */}
          {error && !loading && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 mb-5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm flex-1">{error}</p>
              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 flex-shrink-0"
                onClick={() => fetchPlaylists({ reset: true })}>
                Retry
              </Button>
            </div>
          )}

          {/* Grid — adapts columns based on sidebar open state */}
          <div className={cn(
            "grid gap-3",
            sideOpen && !isMobile
              ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
              : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
          )}>
            {loading
              ? Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="skeleton h-44 rounded-md border border-border/60"
                  />
                ))
              : playlists.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.25) }}
                  >
                    <PlaylistCard
                      href={`/playlists/${p.slug}`}
                      playlist={p}
                      compact
                    />
                  </motion.div>
                ))}
          </div>

          {/* Empty state */}
          {!loading && !error && playlists.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center py-16 sm:py-20"
            >
              <div className="w-16 h-16 rounded-2xl bg-secondary border border-border/60 flex items-center justify-center mb-5">
                <ListVideo className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <h3 className="text-base font-semibold text-foreground/70 mb-1.5">No course lists found</h3>
              <p className="text-sm text-muted-foreground/50 max-w-sm mb-6">
                {query
                  ? `We couldn't find any lists matching "${query}". Try different keywords.`
                  : "No public course lists yet."}
              </p>
              {hasActiveFilters && (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </motion.div>
          )}

          {/* Pagination */}
          {pages > 1 && !loading && (
            <div className="flex justify-center items-center gap-1 sm:gap-1.5 mt-8 sm:mt-10">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 h-9 rounded-lg text-sm font-medium text-muted-foreground disabled:opacity-30 hover:bg-secondary hover:text-foreground transition-all disabled:cursor-not-allowed border border-border/50"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              {Array.from({ length: pages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1)
                .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={`ellipsis-${i}`} className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-muted-foreground/50 text-sm">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        "w-9 h-9 rounded-lg text-sm font-medium transition-all border",
                        page === p
                          ? "bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-500/25"
                          : "border-border/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      {p}
                    </button>
                  )
                )}

              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="flex items-center gap-1 px-3 h-9 rounded-lg text-sm font-medium text-muted-foreground disabled:opacity-30 hover:bg-secondary hover:text-foreground transition-all disabled:cursor-not-allowed border border-border/50"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Floating search + filter bar ──────────────────────────────────── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none w-[calc(100%-2rem)] max-w-3xl">
        <motion.div
          initial={{ y: 28, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="w-full flex items-center bg-background/80 backdrop-blur-2xl border border-border/60 shadow-[0_2px_12px_rgba(0,0,0,0.12)] rounded-full p-1.5 pointer-events-auto"
        >
          <div className="flex items-center gap-2 flex-1 px-4 min-w-0">
            {loading
              ? <div className="w-4 h-4 border-2 border-[#d97757]/40 border-t-[#d97757] rounded-full animate-spin flex-shrink-0" />
              : <Search className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
            }
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  fetchPlaylists({ reset: true });
                }
              }}
              placeholder="Search course lists…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/35 focus:outline-none min-w-0 py-2"
            />
            {query && (
              <button
                onClick={() => {
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  setQuery("");
                  fetchPlaylists({ reset: true, q: "" });
                }}
                className="text-muted-foreground/40 hover:text-foreground transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="w-px h-5 bg-border/50 mx-0.5 flex-shrink-0" />

          <button
            onClick={() => setSideOpen((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 pl-3 pr-4 py-2.5 rounded-full text-sm font-medium transition-colors flex-shrink-0 select-none",
              sideOpen
                ? "bg-orange-500/15 text-[#d97757]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>
        </motion.div>
      </div>

      {/* ── Mobile filter bottom sheet ───────────────────────────────────── */}
      <AnimatePresence>
        {sideOpen && isMobile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setSideOpen(false)}
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[55] bg-card border-t border-border rounded-t-2xl shadow-2xl max-h-[85dvh] flex flex-col"
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border flex-shrink-0">
                <div className="absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 rounded-full bg-border" />
                <h3 className="text-foreground font-semibold text-base mt-1">Filters</h3>
                <button
                  onClick={() => setSideOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pt-5 pb-2">
                <FilterContent {...filterProps} isMobile />
              </div>

              <div className="px-5 py-4 border-t border-border flex-shrink-0">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={() => setSideOpen(false)}
                >
                  {total > 0
                    ? `Show ${total.toLocaleString()} list${total !== 1 ? "s" : ""}`
                    : "Apply filters"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
