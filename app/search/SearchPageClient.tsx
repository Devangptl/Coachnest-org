"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import SearchBar from "@/components/SearchBar";
import CourseCard from "@/components/CourseCard";
import { CourseCardSkeleton } from "@/components/ui/Skeleton";
import {
  BookOpen, AlertCircle, ChevronLeft, ChevronRight, X, SlidersHorizontal,
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

interface Category {
  id: string; name: string; slug: string; icon: string | null;
  _count: { courses: number };
}

export default function SearchPageClient() {
  const sp     = useSearchParams();
  const router = useRouter();

  const [query,      setQuery]      = useState(sp.get("q")        ?? "");
  const [level,      setLevel]      = useState(sp.get("level")    ?? "");
  const [sort,       setSort]       = useState(sp.get("sort")     ?? "popular");
  const [category,   setCategory]   = useState(sp.get("category") ?? "");
  const [page,       setPage]       = useState(1);
  const [courses,    setCourses]    = useState<Course[]>([]);
  const [total,      setTotal]      = useState(0);
  const [pages,      setPages]      = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setCategories(data))
      .catch(() => {});
  }, []);

  const search = useCallback(async (opts: { reset?: boolean; q?: string; pg?: number } = {}) => {
    const { reset = false, q = query, pg = reset ? 1 : page } = opts;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    if (reset) setPage(1);
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      ...(q        && { q }),
      ...(level    && { level }),
      ...(category && { category }),
      sort,
      page:  String(pg),
      limit: "20",
    });

    const urlParams = new URLSearchParams();
    if (q)                  urlParams.set("q",        q);
    if (level)              urlParams.set("level",    level);
    if (category)           urlParams.set("category", category);
    if (sort !== "popular") urlParams.set("sort",     sort);
    router.replace(`/search?${urlParams}`, { scroll: false });

    try {
      const res  = await fetch(`/api/search?${params}`, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data = await res.json();
      setCourses(data.courses ?? []);
      setTotal(data.total   ?? 0);
      setPages(data.totalPages ?? 1);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("Something went wrong. Please try again.");
      setCourses([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [query, level, sort, category, page, router]);

  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      search({ reset: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prevFiltersRef = useRef({ level, sort, category });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (prev.level !== level || prev.sort !== sort || prev.category !== category) {
      prevFiltersRef.current = { level, sort, category };
      search({ reset: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, sort, category]);

  const prevPageRef = useRef(page);
  useEffect(() => {
    if (prevPageRef.current !== page) {
      prevPageRef.current = page;
      search({ pg: page });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const hasActiveFilters = level !== "" || category !== "" || sort !== "popular";

  const categoryOptions = categories.map((c) => ({
    value: c.slug,
    label: `${c.icon ? c.icon + " " : ""}${c.name}`,
  }));

  return (
    <div className="pt-6 pb-16">

      {/* ── Search + Sort row ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3">
        <SearchBar
          initialValue={query}
          onSearch={(q) => { setQuery(q); search({ reset: true, q }); }}
          navigateTo={false}
          className="flex-1 min-w-0"
          placeholder="Search courses..."
        />
        <Select
          value={sort}
          onValueChange={setSort}
          options={SORT_OPT}
          className="flex-shrink-0"
        />
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap mb-5 p-2.5 bg-secondary/40 border border-border/50 rounded-lg">

        {/* Level pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-muted-foreground/60 text-xs font-medium flex items-center gap-1 mr-1">
            <SlidersHorizontal className="w-3 h-3" /> Level
          </span>
          {["", ...LEVELS].map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium border transition-all capitalize",
                level === l
                  ? "bg-orange-500/15 text-orange-400 border-orange-400/30"
                  : "border-border/60 text-muted-foreground hover:border-orange-400/30 hover:text-foreground bg-card"
              )}
            >
              {l || "All"}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-5 w-px bg-border/60 mx-1" />

        {/* Category select */}
        <Select
          value={category}
          onValueChange={setCategory}
          options={categoryOptions}
          placeholder="All Categories"
          className="flex-shrink-0"
        />

        {/* Clear all */}
        <AnimatePresence>
          {hasActiveFilters && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => { setLevel(""); setCategory(""); setSort("popular"); }}
              className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Result count ───────────────────────────────────────────────────── */}
      <p className="text-muted-foreground/60 text-xs mb-4">
        {loading
          ? "Searching…"
          : error
            ? "Search error"
            : `${total.toLocaleString()} course${total !== 1 ? "s" : ""} found`}
      </p>

      {/* ── Error banner ───────────────────────────────────────────────────── */}
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

      {/* ── Course grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {loading
          ? Array.from({ length: 10 }).map((_, i) => <CourseCardSkeleton key={i} compact />)
          : courses.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.25) }}
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

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {!loading && !error && courses.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 sm:py-20"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-secondary mb-4">
            <BookOpen className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <p className="text-base font-medium text-foreground mb-2">No courses found</p>
          <p className="text-sm text-muted-foreground mb-6">
            Try different keywords or adjust your filters
          </p>
          {hasActiveFilters && (
            <Button variant="secondary" size="sm"
              onClick={() => { setLevel(""); setCategory(""); setSort("popular"); }}>
              Clear filters
            </Button>
          )}
        </motion.div>
      )}

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {pages > 1 && !loading && (
        <div className="flex justify-center items-center gap-1 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground disabled:opacity-30 hover:bg-secondary hover:text-foreground transition-all disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
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
                <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-muted-foreground/50 text-sm">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    "w-8 h-8 rounded-md text-sm font-medium transition-all",
                    page === p
                      ? "bg-orange-500 text-white shadow-sm shadow-orange-500/25"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  )}
                >
                  {p}
                </button>
              )
            )}

          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground disabled:opacity-30 hover:bg-secondary hover:text-foreground transition-all disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
