"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  SlidersHorizontal, X, GraduationCap, Search, ArrowUpDown,
  AlertCircle, ChevronLeft, ChevronRight, Users, BookOpen,
  Tag, Lock, UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const SORT_OPT = [
  { value: "newest",  label: "Newest" },
  { value: "popular", label: "Most Students" },
  { value: "largest", label: "Most Courses" },
];

const JOIN_OPT = [
  { value: "",                  label: "All" },
  { value: "OPEN",              label: "Open" },
  { value: "APPROVAL_REQUIRED", label: "By Approval" },
  { value: "INVITE_ONLY",       label: "Invite Only" },
];

const PRICE_OPT = [
  { value: "",     label: "Any" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
];

interface ClassRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  isPaid: boolean;
  joinMode: "OPEN" | "APPROVAL_REQUIRED" | "INVITE_ONLY";
  instructor: { id: string; name: string; avatar: string | null };
  _count: { courses: number; enrollments: number };
}

// ─── Filter panel content (shared by sidebar + drawer) ────────────────────────
function FilterContent({
  sort,      setSort,
  joinMode,  setJoinMode,
  priceType, setPriceType,
  hasActiveFilters, clearFilters,
  isMobile = false,
}: {
  sort: string; setSort: (v: string) => void;
  joinMode: string; setJoinMode: (v: string) => void;
  priceType: string; setPriceType: (v: string) => void;
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
      {/* Sort */}
      <div>
        <h4 className="text-muted-foreground/60 text-[10px] font-bold uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
          <ArrowUpDown className="w-3 h-3" /> Sort by
        </h4>
        <div className={cn("gap-1.5", isMobile ? "grid grid-cols-2" : "space-y-1")}>
          {SORT_OPT.map((o) => (
            <button key={o.value} onClick={() => setSort(o.value)} className={optionCls(sort === o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-border/50" />

      {/* Join mode */}
      <div>
        <h4 className="text-muted-foreground/60 text-[10px] font-bold uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
          <UserPlus className="w-3 h-3" /> How to join
        </h4>
        <div className={cn("gap-1.5", isMobile ? "grid grid-cols-2" : "space-y-1")}>
          {JOIN_OPT.map((o) => (
            <button key={o.value} onClick={() => setJoinMode(o.value)} className={optionCls(joinMode === o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-border/50" />

      {/* Price */}
      <div>
        <h4 className="text-muted-foreground/60 text-[10px] font-bold uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
          <Tag className="w-3 h-3" /> Price
        </h4>
        <div className={cn("gap-1.5", isMobile ? "grid grid-cols-3" : "space-y-1")}>
          {PRICE_OPT.map((o) => (
            <button key={o.value} onClick={() => setPriceType(o.value)} className={optionCls(priceType === o.value)}>
              {o.label}
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

// ─── Class card ───────────────────────────────────────────────────────────────
function ClassCard({ cls }: { cls: ClassRow }) {
  const joinLabel =
    cls.joinMode === "APPROVAL_REQUIRED" ? "Approval" :
    cls.joinMode === "INVITE_ONLY"       ? "Invite"   : null;

  return (
    <Link
      href={`/classes/${cls.slug}`}
      className="group relative flex flex-col bg-card border border-border/60 rounded-md overflow-hidden hover:border-amber-400/40 transition-colors h-full"
    >
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity z-10" />

      <div className="relative h-36 bg-secondary flex-shrink-0 overflow-hidden">
        {cls.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cls.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center">
            <GraduationCap className="w-10 h-10 text-amber-400/60" />
          </div>
        )}

        {/* Price chip */}
        <span className={cn(
          "absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase rounded-full px-2 py-0.5 border backdrop-blur-sm",
          cls.isPaid
            ? "bg-black/55 text-amber-300 border-amber-400/30"
            : "bg-black/55 text-emerald-300 border-emerald-400/30"
        )}>
          {cls.isPaid ? "Paid" : "Free"}
        </span>

        {/* Join mode chip */}
        {joinLabel && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase rounded-full bg-black/60 text-white/90 border border-white/15 px-2 py-0.5 backdrop-blur-sm">
            <Lock className="w-2.5 h-2.5" /> {joinLabel}
          </span>
        )}
      </div>

      <div className="p-3.5 flex-1 flex flex-col">
        <h3 className="text-foreground font-semibold text-[15px] leading-snug line-clamp-1 group-hover:text-amber-400 transition-colors">
          {cls.name}
        </h3>
        <p className="text-muted-foreground/70 text-[11px] mt-0.5 truncate">by {cls.instructor.name}</p>
        {cls.description && (
          <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2 mt-2 flex-1">
            {cls.description}
          </p>
        )}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground/70 mt-3 pt-3 border-t border-border/50">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> {cls._count.courses}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {cls._count.enrollments}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function ClassesBrowseGrid() {
  const sp     = useSearchParams();
  const router = useRouter();

  const [query,     setQuery]     = useState(sp.get("q")         ?? "");
  const [sort,      setSort]      = useState(sp.get("sort")      ?? "newest");
  const [joinMode,  setJoinMode]  = useState(sp.get("joinMode")  ?? "");
  const [priceType, setPriceType] = useState(sp.get("priceType") ?? "");
  const [page,      setPage]      = useState(1);
  const [classes,   setClasses]   = useState<ClassRow[]>([]);
  const [total,     setTotal]     = useState(0);
  const [pages,     setPages]     = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [sideOpen,  setSideOpen]  = useState(false);
  const [isMobile,  setIsMobile]  = useState(false);

  const abortRef    = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (isMobile && sideOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, sideOpen]);

  const fetchClasses = useCallback(
    async (opts: { reset?: boolean; q?: string; pg?: number } = {}) => {
      const { reset = false, q = query, pg = reset ? 1 : page } = opts;

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      if (reset) setPage(1);
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        ...(q         && { q }),
        ...(joinMode  && { joinMode }),
        ...(priceType && { priceType }),
        sort,
        page: String(pg),
      });

      const urlParams = new URLSearchParams();
      if (q)                   urlParams.set("q",         q);
      if (joinMode)            urlParams.set("joinMode",  joinMode);
      if (priceType)           urlParams.set("priceType", priceType);
      if (sort !== "newest")   urlParams.set("sort",      sort);
      router.replace(`/classes${urlParams.toString() ? `?${urlParams}` : ""}`, { scroll: false });

      try {
        const res = await fetch(`/api/classes?${params}`, { signal: abortRef.current.signal });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const data = await res.json();
        setClasses(data.classes ?? []);
        setTotal(data.total      ?? 0);
        setPages(data.totalPages ?? 1);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError("Something went wrong. Please try again.");
        setClasses([]);
        setTotal(0);
        setPages(1);
      } finally {
        setLoading(false);
      }
    },
    [query, sort, joinMode, priceType, page, router],
  );

  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      fetchClasses({ reset: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prevFiltersRef = useRef({ sort, joinMode, priceType });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (prev.sort !== sort || prev.joinMode !== joinMode || prev.priceType !== priceType) {
      prevFiltersRef.current = { sort, joinMode, priceType };
      fetchClasses({ reset: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, joinMode, priceType]);

  const prevPageRef = useRef(page);
  useEffect(() => {
    if (prevPageRef.current !== page) {
      prevPageRef.current = page;
      fetchClasses({ pg: page });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const hasActiveFilters = sort !== "newest" || joinMode !== "" || priceType !== "";
  const activeFilterCount =
    (sort !== "newest" ? 1 : 0) + (joinMode ? 1 : 0) + (priceType ? 1 : 0);

  function clearFilters() {
    setSort("newest");
    setJoinMode("");
    setPriceType("");
  }

  function handleQueryChange(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchClasses({ reset: true, q }), 350);
  }

  const filterProps = {
    sort, setSort,
    joinMode, setJoinMode,
    priceType, setPriceType,
    hasActiveFilters, clearFilters,
  };

  return (
    <div className="pt-4 pb-32">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-amber-400" />
          {query
            ? <><span className="text-muted-foreground/50 font-medium">Classes for </span><span className="text-[#d97757]">"{query}"</span></>
            : "Browse Classes"
          }
        </h1>
        <p className="text-sm text-muted-foreground/50 mt-0.5">
          {loading
            ? "Loading…"
            : error
              ? "Something went wrong"
              : `${total.toLocaleString()} class${total !== 1 ? "es" : ""} found`}
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
            {sort !== "newest" && (
              <motion.button
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
                onClick={() => setSort("newest")}
                className="flex items-center gap-1 text-xs bg-orange-500/10 text-[#d97757] border border-[#d97757]/20 rounded-full px-2.5 py-1 hover:bg-orange-500/20 transition-colors"
              >
                <ArrowUpDown className="w-2.5 h-2.5" />
                {SORT_OPT.find((o) => o.value === sort)?.label}
                <X className="w-3 h-3" />
              </motion.button>
            )}
            {joinMode && (
              <motion.button
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
                onClick={() => setJoinMode("")}
                className="flex items-center gap-1 text-xs bg-orange-500/10 text-[#d97757] border border-[#d97757]/20 rounded-full px-2.5 py-1 hover:bg-orange-500/20 transition-colors"
              >
                <UserPlus className="w-2.5 h-2.5" />
                {JOIN_OPT.find((o) => o.value === joinMode)?.label}
                <X className="w-3 h-3" />
              </motion.button>
            )}
            {priceType && (
              <motion.button
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
                onClick={() => setPriceType("")}
                className="flex items-center gap-1 text-xs bg-orange-500/10 text-[#d97757] border border-[#d97757]/20 rounded-full px-2.5 py-1 hover:bg-orange-500/20 transition-colors"
              >
                <Tag className="w-2.5 h-2.5" />
                {PRICE_OPT.find((o) => o.value === priceType)?.label}
                <X className="w-3 h-3" />
              </motion.button>
            )}
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
          {error && !loading && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 mb-5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm flex-1">{error}</p>
              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 flex-shrink-0"
                onClick={() => fetchClasses({ reset: true })}>
                Retry
              </Button>
            </div>
          )}

          <div className={cn(
            "grid gap-4",
            sideOpen && !isMobile
              ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          )}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-64 rounded-md bg-card border border-border/60 animate-pulse" />
                ))
              : classes.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.25) }}
                  >
                    <ClassCard cls={c} />
                  </motion.div>
                ))}
          </div>

          {!loading && !error && classes.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center py-16 sm:py-20"
            >
              <div className="w-16 h-16 rounded-2xl bg-secondary border border-border/60 flex items-center justify-center mb-5">
                <GraduationCap className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <h3 className="text-base font-semibold text-foreground/70 mb-1.5">No classes found</h3>
              <p className="text-sm text-muted-foreground/50 max-w-sm mb-6">
                {query
                  ? `We couldn't find any classes matching "${query}". Try different keywords or adjust your filters.`
                  : "No public classes match your current filters."}
              </p>
              {hasActiveFilters && (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </motion.div>
          )}

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
                  fetchClasses({ reset: true });
                }
              }}
              placeholder="Search classes, instructors…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/35 focus:outline-none min-w-0 py-2"
            />
            {query && (
              <button
                onClick={() => {
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  setQuery("");
                  fetchClasses({ reset: true, q: "" });
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
                    ? `Show ${total.toLocaleString()} class${total !== 1 ? "es" : ""}`
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
