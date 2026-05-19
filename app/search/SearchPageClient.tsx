"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import CourseCard from "@/components/CourseCard";
import PlaylistCard, { type PlaylistCardData } from "@/components/playlists/PlaylistCard";
import { CourseCardSkeleton } from "@/components/ui/Skeleton";
import {
  Filter, SlidersHorizontal, X, BookOpen,
  AlertCircle, ChevronLeft, ChevronRight, ListVideo, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

const LEVELS = ["beginner", "intermediate", "advanced"];
const SORT_OPT = [
  { value: "popular",    label: "Most Popular" },
  { value: "newest",     label: "Newest" },
  { value: "price_asc",  label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
];

interface Course {
  id: string; title: string; description: string; thumbnail: string | null;
  price: number | null; discountPrice: number | null; isFree: boolean;
  level: string; totalLessons: number; avgRating: number;
  createdBy: { name: string }; _count: { enrollments: number; reviews: number };
  category: { name: string; slug: string } | null;
}

// ─── Filter panel content (shared by sidebar + drawer) ─────────────────────
function FilterContent({
  level, setLevel,
  hasActiveFilters,
  clearFilters,
  isMobile = false,
}: {
  level: string; setLevel: (v: string) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  isMobile?: boolean;
}) {
  return (
    <div className={cn("space-y-6", isMobile && "pb-4")}>
      {/* Level filter */}
      <div>
        <h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Filter className="w-3 h-3" /> Level
        </h4>
        <div className={cn("gap-2", isMobile ? "grid grid-cols-2" : "space-y-1")}>
          {["", ...LEVELS].map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm capitalize transition-all",
                isMobile && "text-center",
                level === l
                  ? "bg-orange-500/15 text-[#d97757] border border-[#d97757]/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {l || "All levels"}
            </button>
          ))}
        </div>
      </div>

      {/* Clear */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-foreground"
          onClick={clearFilters}
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Clear all filters
        </Button>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function SearchPageClient() {
  const sp     = useSearchParams();
  const router = useRouter();

  const [query,      setQuery]      = useState(sp.get("q")        ?? "");
  const [level,      setLevel]      = useState(sp.get("level")    ?? "");
  const [sort,       setSort]       = useState(sp.get("sort")     ?? "popular");
  const [page,       setPage]       = useState(1);
  const [courses,    setCourses]    = useState<Course[]>([]);
  const [playlists,  setPlaylists]  = useState<PlaylistCardData[]>([]);
  const [total,      setTotal]      = useState(0);
  const [pages,      setPages]      = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [sideOpen,   setSideOpen]   = useState(false);
  const [isMobile,   setIsMobile]   = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // Track viewport for mobile/desktop filter treatment
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (!e.matches) setSideOpen(false); // close drawer when resizing to desktop
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobile && sideOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, sideOpen]);

  const search = useCallback(async (opts: { reset?: boolean; q?: string; pg?: number } = {}) => {
    const { reset = false, q = query, pg = reset ? 1 : page } = opts;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    if (reset) setPage(1);
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      ...(q     && { q }),
      ...(level && { level }),
      sort,
      page:  String(pg),
      limit: "12",
    });

    const urlParams = new URLSearchParams();
    if (q)                  urlParams.set("q",     q);
    if (level)              urlParams.set("level", level);
    if (sort !== "popular") urlParams.set("sort",  sort);
    router.replace(`/search?${urlParams}`, { scroll: false });

    try {
      const res  = await fetch(`/api/search?${params}`, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data = await res.json();
      setCourses(data.courses ?? []);
      setPlaylists(data.playlists ?? []);
      setTotal(data.total   ?? 0);
      setPages(data.totalPages ?? 1);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("Something went wrong. Please try again.");
      setCourses([]);
      setPlaylists([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [query, level, sort, page, router]);

  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      search({ reset: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prevFiltersRef = useRef({ level, sort });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (prev.level !== level || prev.sort !== sort) {
      prevFiltersRef.current = { level, sort };
      search({ reset: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, sort]);

  const prevPageRef = useRef(page);
  useEffect(() => {
    if (prevPageRef.current !== page) {
      prevPageRef.current = page;
      search({ pg: page });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const hasActiveFilters = level !== "" || sort !== "popular";
  const activeFilterCount = [level, sort !== "popular"].filter(Boolean).length;

  function clearFilters() {
    setLevel("");
    setSort("popular");
  }

  const filterProps = {
    level, setLevel, hasActiveFilters, clearFilters,
  };

  return (
    <div className="pt-4 pb-16">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground tracking-tight">
          {query
            ? <><span className="text-muted-foreground/50 font-medium">Results for </span><span className="text-[#d97757]">"{query}"</span></>
            : "Browse Courses"
          }
        </h1>
        <p className="text-sm text-muted-foreground/50 mt-0.5">
          {loading
            ? "Searching…"
            : error
              ? "Something went wrong"
              : `${total.toLocaleString()} course${total !== 1 ? "s" : ""} found`}
        </p>
      </div>

      {/* ── Controls bar ─────────────────────────────────────────────────── */}
      <div className="mb-5 flex items-center gap-2.5">
        <SearchBar
          initialValue={query}
          onSearch={(q) => { setQuery(q); search({ reset: true, q }); }}
          navigateTo={false}
          className="flex-1 min-w-0"
          placeholder="Search courses, topics, instructors…"
        />
        <Select
          value={sort}
          onValueChange={setSort}
          options={SORT_OPT}
          className="flex-shrink-0 w-auto min-w-[150px]"
        />
        <Button
          variant="secondary"
          size="md"
          onClick={() => setSideOpen((o) => !o)}
          className={cn(
            "flex-shrink-0",
            sideOpen && "border-[#d97757]/40 bg-orange-500/10 text-[#d97757]"
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold leading-none">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* ── Active filter chips ──────────────────────────────────────────── */}
      <AnimatePresence>
        {level && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 flex-wrap mb-4 overflow-hidden"
          >
            <span className="text-[11px] text-muted-foreground/40 font-medium">Filtering by:</span>
            <motion.button
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
              onClick={() => setLevel("")}
              className="flex items-center gap-1 text-xs bg-orange-500/10 text-[#d97757] border border-[#d97757]/20 rounded-full px-2.5 py-1 hover:bg-orange-500/20 transition-colors"
            >
              <span className="capitalize">{level}</span>
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
                onClick={() => search({ reset: true })}>
                Retry
              </Button>
            </div>
          )}

          {/* Matching course lists (playlists) — first page only */}
          {!loading && !error && page === 1 && playlists.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <ListVideo className="w-4 h-4 text-orange-500" />
                  Course lists
                </h2>
                <Link
                  href="/playlists"
                  className="text-xs font-medium text-orange-500 hover:text-orange-400 inline-flex items-center gap-1"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {playlists.map((p) => (
                  <PlaylistCard
                    key={p.id}
                    href={`/playlists/${p.slug}`}
                    playlist={p}
                    compact
                  />
                ))}
              </div>
            </section>
          )}

          {/* Grid — adapts columns based on sidebar open state */}
          <div className={cn(
            "grid gap-3",
            sideOpen && !isMobile
              ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
              : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          )}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <CourseCardSkeleton key={i} compact />)
              : courses.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  >
                    <CourseCard
                      id={c.id}
                      title={c.title}
                      description={c.description}
                      thumbnail={c.thumbnail}
                      instructorName={c.createdBy.name}
                      price={c.price}
                      discountPrice={c.discountPrice}
                      isFree={c.isFree}
                      level={c.level}
                      totalLessons={c.totalLessons}
                      enrollmentCount={c._count.enrollments}
                      avgRating={c.avgRating}
                      reviewCount={c._count.reviews}
                      compact
                    />
                  </motion.div>
                ))}
          </div>

          {/* Empty state */}
          {!loading && !error && courses.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 sm:py-20"
            >
              <div className="w-16 h-16 rounded-2xl bg-secondary border border-border/60 flex items-center justify-center mb-5">
                <BookOpen className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <h3 className="text-base font-semibold text-foreground/70 mb-1.5">No courses found</h3>
              <p className="text-sm text-muted-foreground/50 max-w-sm mb-6">
                {query
                  ? `We couldn't find any courses matching "${query}". Try different keywords or adjust your filters.`
                  : "No courses match your current filters. Try adjusting or clearing them."}
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

      {/* ── Mobile filter bottom sheet ───────────────────────────────────── */}
      <AnimatePresence>
        {sideOpen && isMobile && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setSideOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl shadow-2xl max-h-[85dvh] flex flex-col"
            >
              {/* Drag handle + header */}
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

              {/* Scrollable filter content */}
              <div className="flex-1 overflow-y-auto px-5 pt-5 pb-2">
                <FilterContent {...filterProps} isMobile />
              </div>

              {/* Apply button */}
              <div className="px-5 py-4 border-t border-border flex-shrink-0">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={() => setSideOpen(false)}
                >
                  {total > 0
                    ? `Show ${total.toLocaleString()} course${total !== 1 ? "s" : ""}`
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
