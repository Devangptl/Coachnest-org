"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import SearchBar from "@/components/SearchBar";
import CourseCard from "@/components/CourseCard";
import { CourseCardSkeleton } from "@/components/ui/Skeleton";
import { Filter, SlidersHorizontal, X, BookOpen, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
  const [sideOpen,   setSideOpen]   = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // AbortController ref to cancel in-flight requests on new searches
  const abortRef = useRef<AbortController | null>(null);

  // Fetch categories once on mount
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setCategories(data))
      .catch(() => {/* categories are optional UI sugar */});
  }, []);

  const search = useCallback(async (opts: { reset?: boolean; q?: string; pg?: number } = {}) => {
    const { reset = false, q = query, pg = reset ? 1 : page } = opts;

    // Cancel previous in-flight request
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
      limit: "12",
    });

    // Sync URL
    const urlParams = new URLSearchParams();
    if (q)                     urlParams.set("q",        q);
    if (level)                 urlParams.set("level",    level);
    if (category)              urlParams.set("category", category);
    if (sort !== "popular")    urlParams.set("sort",     sort);
    router.replace(`/search?${urlParams}`, { scroll: false });

    try {
      const res  = await fetch(`/api/search?${params}`, { signal: abortRef.current.signal });
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data = await res.json();
      setCourses(data.courses ?? []);
      setTotal(data.total   ?? 0);
      setPages(data.totalPages ?? 1);
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // ignore cancelled requests
      setError("Something went wrong. Please try again.");
      setCourses([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [query, level, sort, category, page, router]);

  // Run on mount with initial URL params
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      search({ reset: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-run when filters change (not on initial mount)
  const prevFiltersRef = useRef({ level, sort, category });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (prev.level !== level || prev.sort !== sort || prev.category !== category) {
      prevFiltersRef.current = { level, sort, category };
      search({ reset: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, sort, category]);

  // Re-run when page changes (not on reset)
  const prevPageRef = useRef(page);
  useEffect(() => {
    if (prevPageRef.current !== page) {
      prevPageRef.current = page;
      search({ pg: page });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const hasActiveFilters = level !== "" || category !== "" || sort !== "popular";

  function clearFilters() {
    setLevel("");
    setCategory("");
    setSort("popular");
  }

  return (
    <div className="pb-16">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <SearchBar
          initialValue={query}
          onSearch={(q) => { setQuery(q); search({ reset: true, q }); }}
          navigateTo={false}
          className="flex-1 min-w-64"
          placeholder="Search 500+ courses..."
        />
        <Button
          variant="secondary"
          size="md"
          onClick={() => setSideOpen((o) => !o)}
          className={cn(sideOpen && "border-orange-400/40 bg-orange-500/10 text-orange-400")}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold leading-none">
              {[level, category, sort !== "popular"].filter(Boolean).length}
            </span>
          )}
        </Button>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="input-glass w-auto text-sm py-2.5"
        >
          {SORT_OPT.map((o) => (
            <option key={o.value} value={o.value} className="bg-card">
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-8">
        {/* Sidebar filters */}
        <AnimatePresence>
          {sideOpen && (
            <motion.aside
              initial={{ opacity: 0, x: -20, width: 0 }}
              animate={{ opacity: 1, x: 0,  width: 272 }}
              exit={{    opacity: 0, x: -20, width: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 overflow-hidden"
            >
              <div className="glass p-5 space-y-6 w-68 sticky top-6">
                {/* Level filter */}
                <div>
                  <h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Filter className="w-3 h-3" /> Level
                  </h4>
                  <div className="space-y-1">
                    {["", ...LEVELS].map((l) => (
                      <button
                        key={l}
                        onClick={() => setLevel(l)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm capitalize transition-all",
                          level === l
                            ? "bg-orange-500/15 text-orange-400 border border-orange-400/25"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        )}
                      >
                        {l || "All levels"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category filter */}
                {categories.length > 0 && (
                  <div>
                    <h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <BookOpen className="w-3 h-3" /> Category
                    </h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                      <button
                        onClick={() => setCategory("")}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm transition-all",
                          category === ""
                            ? "bg-orange-500/15 text-orange-400 border border-orange-400/25"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        )}
                      >
                        All categories
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setCategory(cat.slug)}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between gap-2",
                            category === cat.slug
                              ? "bg-orange-500/15 text-orange-400 border border-orange-400/25"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                          )}
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            {cat.icon && <span>{cat.icon}</span>}
                            <span className="truncate">{cat.name}</span>
                          </span>
                          <span className="text-xs text-muted-foreground/50 flex-shrink-0">
                            {cat._count.courses}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clear filters */}
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
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {/* Result count + active filter chips */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <p className="text-muted-foreground/70 text-sm">
              {loading
                ? "Searching..."
                : error
                  ? "Search error"
                  : `${total.toLocaleString()} course${total !== 1 ? "s" : ""} found`}
            </p>

            {/* Active filter chips */}
            <AnimatePresence>
              {level && (
                <motion.button
                  key="chip-level"
                  initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
                  onClick={() => setLevel("")}
                  className="flex items-center gap-1 text-xs bg-orange-500/10 text-orange-400 border border-orange-400/20 rounded-full px-2.5 py-1 hover:bg-orange-500/20 transition-colors"
                >
                  <span className="capitalize">{level}</span>
                  <X className="w-3 h-3" />
                </motion.button>
              )}
              {category && (
                <motion.button
                  key="chip-category"
                  initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
                  onClick={() => setCategory("")}
                  className="flex items-center gap-1 text-xs bg-orange-500/10 text-orange-400 border border-orange-400/20 rounded-full px-2.5 py-1 hover:bg-orange-500/20 transition-colors"
                >
                  <span>{categories.find((c) => c.slug === category)?.name ?? category}</span>
                  <X className="w-3 h-3" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Error state */}
          {error && !loading && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 mb-6">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
              <Button variant="ghost" size="sm" className="ml-auto text-red-400 hover:text-red-300"
                onClick={() => search({ reset: true })}>
                Retry
              </Button>
            </div>
          )}

          {/* Course grid */}
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <CourseCardSkeleton key={i} />)
              : courses.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
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
                    />
                  </motion.div>
                ))}
          </div>

          {/* Empty state */}
          {!loading && !error && courses.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary mb-4">
                <BookOpen className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <p className="text-lg font-medium text-foreground mb-2">No courses found</p>
              <p className="text-sm text-muted-foreground mb-6">
                Try different keywords or adjust your filters
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
            <div className="flex justify-center items-center gap-1.5 mt-10">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground disabled:opacity-30 hover:bg-secondary hover:text-foreground transition-all disabled:cursor-not-allowed"
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
                    <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-muted-foreground/50 text-sm">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        "w-9 h-9 rounded-md text-sm font-medium transition-all",
                        page === p
                          ? "bg-orange-500 text-white shadow-md shadow-orange-500/25"
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
                className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground disabled:opacity-30 hover:bg-secondary hover:text-foreground transition-all disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
