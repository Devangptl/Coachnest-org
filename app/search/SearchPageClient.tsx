"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import SearchBar from "@/components/SearchBar";
import CourseCard from "@/components/CourseCard";
import { CourseCardSkeleton } from "@/components/ui/Skeleton";
import { Filter, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const LEVELS   = ["beginner", "intermediate", "advanced"];
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

export default function SearchPageClient() {
  const sp     = useSearchParams();
  const router = useRouter();

  const [query,    setQuery]    = useState(sp.get("q")    ?? "");
  const [level,    setLevel]    = useState(sp.get("level") ?? "");
  const [sort,     setSort]     = useState(sp.get("sort")  ?? "popular");
  const [page,     setPage]     = useState(1);
  const [courses,  setCourses]  = useState<Course[]>([]);
  const [total,    setTotal]    = useState(0);
  const [pages,    setPages]    = useState(1);
  const [loading,  setLoading]  = useState(false);
  const [sideOpen, setSideOpen] = useState(false);

  const search = useCallback(async (reset = false) => {
    setLoading(true);
    const currentPage = reset ? 1 : page;
    if (reset) setPage(1);

    const params = new URLSearchParams({
      ...(query && { q: query }),
      ...(level && { level }),
      sort,
      page:  String(currentPage),
      limit: "12",
    });

    try {
      const res  = await fetch(`/api/search?${params}`);
      const data = await res.json();
      setCourses(data.courses ?? []);
      setTotal(data.total ?? 0);
      setPages(data.totalPages ?? 1);

      // Sync URL
      const urlParams = new URLSearchParams();
      if (query) urlParams.set("q",     query);
      if (level) urlParams.set("level", level);
      if (sort !== "popular") urlParams.set("sort", sort);
      router.replace(`/search?${urlParams}`, { scroll: false });
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [query, level, sort, page, router]);

  // Run on mount & filter changes
  useEffect(() => { search(true); }, [level, sort]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { search(); },    [page]);           // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      {/* Top bar */}
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        <SearchBar
          initialValue={query}
          onSearch={(q) => { setQuery(q); search(true); }}
          navigateTo={false}
          className="flex-1 min-w-64"
          placeholder="Search 500+ courses..."
        />
        <Button variant="secondary" size="md" onClick={() => setSideOpen((o) => !o)}>
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </Button>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="input-glass w-auto text-sm py-2.5"
        >
          {SORT_OPT.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#1a1636]">
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
              animate={{ opacity: 1, x: 0,  width: 256 }}
              exit={{    opacity: 0, x: -20, width: 0 }}
              className="flex-shrink-0 overflow-hidden"
            >
              <div className="glass p-5 space-y-6 w-64">
                {/* Level */}
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
                            ? "bg-orange-500/15 text-orange-300 border border-orange-400/25"
                            : "text-muted-foreground hover:text-white hover:bg-secondary"
                        )}
                      >
                        {l || "All levels"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => { setLevel(""); setSort("popular"); }}
                >
                  Clear filters
                </Button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Results */}
        <div className="flex-1 min-w-0">
          <p className="text-muted-foreground/70 text-sm mb-5">
            {loading ? "Searching..." : `${total} course${total !== 1 ? "s" : ""} found`}
          </p>

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

          {courses.length === 0 && !loading && (
            <div className="text-center py-20 text-muted-foreground/70">
              <p className="text-lg font-medium text-white mb-2">No courses found</p>
              <p className="text-sm">Try a different keyword or clear the filters</p>
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    "w-9 h-9 rounded-xl text-sm font-medium transition-all",
                    page === p
                      ? "bg-orange-500 text-white"
                      : "bg-secondary text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
