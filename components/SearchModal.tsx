"use client";

/**
 * SearchModal — Spotlight / command-palette search.
 * Trigger: navbar button | ⌘K / Ctrl+K
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Search, X, Star, BookOpen, Flame, Clock, Hash,
  TrendingUp, ArrowUpRight, Loader2, GraduationCap,
  ChevronRight, History, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id: string; title: string; thumbnail: string | null;
  price: number | null; discountPrice: number | null; isFree: boolean;
  level: string; totalLessons: number; avgRating: number;
  createdBy: { name: string };
  _count: { enrollments: number };
  category: { name: string } | null;
}

interface Props { open: boolean; onClose: () => void; }

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVELS = [
  { value: "",             label: "All"          },
  { value: "beginner",     label: "Beginner"     },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced",     label: "Advanced"     },
];

const SORT_OPTIONS = [
  { value: "popular",    label: "Popular",  icon: Flame    },
  { value: "newest",     label: "Newest",   icon: Clock    },
  { value: "price_asc",  label: "Cheapest", icon: TrendingUp },
  { value: "price_desc", label: "Priciest", icon: TrendingUp },
];

const TRENDING = [
  "React", "Next.js", "TypeScript", "Python",
  "Node.js", "UI/UX Design", "Data Science", "Machine Learning",
  "Tailwind CSS", "System Design",
];

const MAX_RECENT = 5;
const LS_KEY     = "cn_recent_searches";

// ─── Local-storage helpers ────────────────────────────────────────────────────

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]"); } catch { return []; }
}
function pushRecent(q: string) {
  const next = [q, ...getRecent().filter((r) => r !== q)].slice(0, MAX_RECENT);
  localStorage.setItem(LS_KEY, JSON.stringify(next));
}
function dropRecent(q: string) {
  localStorage.setItem(LS_KEY, JSON.stringify(getRecent().filter((r) => r !== q)));
}

// ─── Level badge ──────────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    beginner:     "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    intermediate: "text-blue-400    bg-blue-500/10    border-blue-500/20",
    advanced:     "text-purple-400  bg-purple-500/10  border-purple-500/20",
  };
  return (
    <span className={cn(
      "text-[10px] font-semibold px-1.5 py-px rounded border capitalize leading-none",
      map[level] ?? "text-muted-foreground/50 bg-white/5 border-white/10"
    )}>
      {level}
    </span>
  );
}

// ─── Price chip ───────────────────────────────────────────────────────────────

function PriceChip({ isFree, price, discountPrice }: { isFree: boolean; price: number | null; discountPrice: number | null }) {
  if (isFree) return (
    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-px rounded">
      Free
    </span>
  );
  const amt = discountPrice ?? price;
  if (!amt) return null;
  return (
    <span className="text-[11px] font-semibold text-foreground/70">
      ₹{Number(amt).toLocaleString("en-IN")}
    </span>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 animate-pulse">
      <div className="w-9 h-7 rounded-md bg-white/[0.06] flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-2.5 bg-white/[0.06] rounded-full w-3/5" />
        <div className="h-2 bg-white/[0.04] rounded-full w-2/5" />
      </div>
      <div className="w-8 h-2 bg-white/[0.04] rounded-full" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SearchModal({ open, onClose }: Props) {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);

  const [query,   setQuery]   = useState("");
  const [level,   setLevel]   = useState("");
  const [sort,    setSort]    = useState("popular");
  const [courses, setCourses] = useState<Course[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(-1);
  const [recent,  setRecent]  = useState<string[]>([]);

  // ── Reset on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setRecent(getRecent());
      setQuery(""); setCourses([]); setTotal(0);
      setFocused(-1); setLevel(""); setSort("popular");
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  // ── Body scroll lock ───────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // ── Search ─────────────────────────────────────────────────────────────────
  const doSearch = useCallback(async (q: string, lv: string, so: string) => {
    setLoading(true); setFocused(-1);
    try {
      const p = new URLSearchParams({ sort: so, limit: "8" });
      if (q)  p.set("q",     q);
      if (lv) p.set("level", lv);
      const data = await fetch(`/api/search?${p}`).then((r) => r.json());
      setCourses(data.courses ?? []);
      setTotal(data.total ?? 0);
    } catch { setCourses([]); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => doSearch(query, level, sort), 250);
    return () => clearTimeout(id);
  }, [query, level, sort, open, doSearch]);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setFocused((f) => Math.min(f + 1, courses.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setFocused((f) => Math.max(f - 1, -1)); }
      if (e.key === "Enter" && focused >= 0) {
        const c = courses[focused];
        if (c) { open_course(c.id); }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, courses, focused, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (focused >= 0 && listRef.current) {
      (listRef.current.children[focused] as HTMLElement)?.scrollIntoView({ block: "nearest" });
    }
  }, [focused]);

  function open_course(id: string) {
    if (query.trim()) pushRecent(query.trim());
    router.push(`/courses/${id}`);
    onClose();
  }

  function pickSuggestion(q: string) {
    setQuery(q);
    doSearch(q, level, sort);
  }

  function goFullSearch() {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (level) p.set("level", level);
    if (sort !== "popular") p.set("sort", sort);
    if (query.trim()) pushRecent(query.trim());
    router.push(`/search?${p}`);
    onClose();
  }

  function removeOne(r: string, e: React.MouseEvent) {
    e.stopPropagation();
    dropRecent(r);
    setRecent(getRecent());
  }

  const isEmpty = !query && !loading;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ──────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[200] bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* ── Wrapper ───────────────────────────────────────────────────── */}
          <div className="fixed inset-0 z-[201] flex items-start justify-center px-3 sm:px-4 pt-[2vh] sm:pt-[5vh] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,   scale: 1    }}
              exit={{    opacity: 0, y: -10,  scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-[780px] pointer-events-auto max-h-[96dvh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="relative rounded-2xl overflow-hidden border border-border shadow-[0 5px 12px rgba(0,0,0,1)] flex flex-col"
                style={{ background: "hsl(var(--card))" }}
              >
                {/* Orange top glow line */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/70 to-transparent" />
                {/* Subtle inner glow */}
                <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-orange-500/[0.04] to-transparent pointer-events-none" />

                {/* ── Search input ─────────────────────────────────────── */}
                <div className="relative flex items-center gap-3 px-4 py-3.5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                    {loading
                      ? <Loader2 className="w-3.5 h-3.5 text-orange-400 animate-spin" />
                      : <Search className="w-3.5 h-3.5 text-orange-400" />}
                  </div>
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search courses, topics, instructors…"
                    className="flex-1 bg-transparent text-[15px] font-medium text-foreground placeholder:text-muted-foreground/35 focus:outline-none"
                  />
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {query
                      ? <button onClick={() => setQuery("")}
                          className="w-6 h-6 rounded-md bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-all">
                          <X className="w-3 h-3" />
                        </button>
                      : <kbd className="hidden sm:flex text-[10px] font-medium text-muted-foreground/25 bg-white/[0.04] border border-white/[0.07] rounded px-1.5 py-0.5">
                          esc
                        </kbd>}
                  </div>
                </div>

                {/* ── Filter strip ─────────────────────────────────────── */}
                <div className="flex items-center gap-1.5 px-4 pb-2.5 overflow-x-auto scrollbar-hide">
                  {/* Level chips */}
                  {LEVELS.map((l) => (
                    <button key={l.value} onClick={() => setLevel(l.value)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all border flex-shrink-0",
                        level === l.value
                          ? "bg-orange-500/15 text-orange-400 border-orange-400/30"
                          : "bg-white/[0.03] text-muted-foreground/50 border-white/[0.06] hover:bg-white/[0.06] hover:text-muted-foreground"
                      )}>
                      {l.label}
                    </button>
                  ))}

                  <div className="w-px h-3.5 bg-white/[0.08] flex-shrink-0 mx-0.5" />

                  {/* Sort chips */}
                  {SORT_OPTIONS.map((o) => (
                    <button key={o.value} onClick={() => setSort(o.value)}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all border flex-shrink-0",
                        sort === o.value
                          ? "bg-orange-500/15 text-orange-400 border-orange-400/30"
                          : "bg-white/[0.03] text-muted-foreground/50 border-white/[0.06] hover:bg-white/[0.06] hover:text-muted-foreground"
                      )}>
                      <o.icon className="w-2.5 h-2.5" />
                      {o.label}
                    </button>
                  ))}
                </div>

                {/* Hairline */}
                <div className="h-px bg-white/[0.06]" />

                {/* ── Scrollable body ───────────────────────────────────── */}
                <div className="overflow-y-auto overscroll-contain max-h-[55vh] sm:max-h-[62vh] relative">

                  {/* ── Empty state (no query) ─────────────────────────── */}
                  {isEmpty && (
                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">

                      {/* Recent searches */}
                      {recent.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between px-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 flex items-center gap-1">
                              <History className="w-2.5 h-2.5" /> Recent
                            </span>
                            <button
                              onClick={() => { localStorage.removeItem(LS_KEY); setRecent([]); }}
                              className="text-[10px] text-muted-foreground/25 hover:text-muted-foreground/60 transition-colors"
                            >
                              Clear
                            </button>
                          </div>
                          <div>
                            {recent.map((r) => (
                              <div key={r}
                                onClick={() => pickSuggestion(r)}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer group hover:bg-white/[0.04] transition-colors"
                              >
                                <History className="w-3 h-3 text-muted-foreground/25 flex-shrink-0" />
                                <span className="flex-1 text-[13px] text-muted-foreground/60 group-hover:text-foreground transition-colors truncate">{r}</span>
                                <button onClick={(e) => removeOne(r, e)}
                                  className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded flex items-center justify-center text-muted-foreground/30 hover:text-muted-foreground hover:bg-white/10 transition-all">
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Trending */}
                      <div className={recent.length === 0 ? "sm:col-span-2" : ""}>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 flex items-center gap-1 px-2 mb-1">
                          <TrendingUp className="w-2.5 h-2.5" /> Trending
                        </span>
                        <div className="flex flex-wrap gap-1 px-2">
                          {TRENDING.slice(0, recent.length > 0 ? 5 : 10).map((t) => (
                            <button key={t} onClick={() => pickSuggestion(t)}
                              className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03] hover:bg-orange-500/10 border border-white/[0.06] hover:border-orange-400/20 text-[11px] text-muted-foreground/50 hover:text-orange-400 transition-all">
                              <Hash className="w-2.5 h-2.5" />
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Loading ────────────────────────────────────────── */}
                  {loading && (
                    <div className="py-1">
                      {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
                    </div>
                  )}

                  {/* ── Results count ─────────────────────────────────── */}
                  {!loading && query && (
                    <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30">
                        {total === 0 ? "No results" : `${total} course${total !== 1 ? "s" : ""}`}
                      </span>
                      {total > 8 && (
                        <button onClick={goFullSearch}
                          className="text-[10px] text-orange-400/60 hover:text-orange-400 transition-colors flex items-center gap-0.5">
                          View all <ChevronRight className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── Course rows ────────────────────────────────────── */}
                  {!loading && courses.length > 0 && (
                    <div ref={listRef} className="px-2 pb-2">
                      {courses.map((c, i) => (
                        <motion.div key={c.id}
                          initial={{ opacity: 0, y: 3 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03, duration: 0.15 }}
                        >
                          <Link
                            href={`/courses/${c.id}`}
                            onClick={() => open_course(c.id)}
                            onMouseEnter={() => setFocused(i)}
                            className={cn(
                              "flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-all group border",
                              focused === i
                                ? "bg-orange-500/[0.07] border-orange-400/[0.15]"
                                : "border-transparent hover:bg-white/[0.035] hover:border-white/[0.07]"
                            )}
                          >
                            {/* Thumbnail */}
                            <div className="w-10 h-8 rounded-md overflow-hidden bg-white/[0.05] border border-white/[0.07] flex-shrink-0">
                              {c.thumbnail
                                ? <img src={c.thumbnail} alt="" className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center">
                                    <BookOpen className="w-3 h-3 text-white/15" />
                                  </div>}
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-[13px] font-medium truncate leading-snug transition-colors",
                                focused === i ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
                              )}>
                                {c.title}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/40 truncate max-w-[110px]">
                                  <GraduationCap className="w-2.5 h-2.5 flex-shrink-0" />
                                  {c.createdBy.name}
                                </span>
                                {c.avgRating > 0 && (
                                  <span className="flex items-center gap-0.5 text-[11px] text-amber-400/70 font-semibold flex-shrink-0">
                                    <Star className="w-2.5 h-2.5 fill-amber-400/70 flex-shrink-0" />
                                    {c.avgRating.toFixed(1)}
                                  </span>
                                )}
                                <span className="text-muted-foreground/20 flex-shrink-0">·</span>
                                <LevelBadge level={c.level} />
                                {c._count.enrollments > 0 && (
                                  <>
                                    <span className="text-muted-foreground/20 flex-shrink-0 hidden sm:block">·</span>
                                    <span className="hidden sm:flex items-center gap-0.5 text-[11px] text-muted-foreground/30 flex-shrink-0">
                                      <Users className="w-2.5 h-2.5" />
                                      {c._count.enrollments > 999
                                        ? `${(c._count.enrollments / 1000).toFixed(1)}k`
                                        : c._count.enrollments}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Right side */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <PriceChip isFree={c.isFree} price={c.price} discountPrice={c.discountPrice} />
                              <ChevronRight className={cn(
                                "w-3.5 h-3.5 transition-all",
                                focused === i ? "text-orange-400/70 translate-x-0.5" : "text-white/[0.08]"
                              )} />
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* ── No results ─────────────────────────────────────── */}
                  {!loading && query && courses.length === 0 && (
                    <div className="flex flex-col items-center py-8 text-center">
                      <div className="w-10 h-10 rounded-md bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-2.5">
                        <Search className="w-4 h-4 text-white/15" />
                      </div>
                      <p className="text-sm font-medium text-foreground/50">No results for "{query}"</p>
                      <p className="text-[12px] text-muted-foreground/30 mt-0.5">Try different keywords or clear filters</p>
                    </div>
                  )}

                  {/* Bottom fade gradient */}
                  {courses.length > 4 && (
                    <div className="sticky bottom-0 h-6 bg-gradient-to-t from-card to-transparent pointer-events-none" />
                  )}
                </div>

                {/* ── Footer ───────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.05] bg-white/[0.01]">
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground/20 font-medium">
                    <span className="hidden sm:flex items-center gap-1">
                      <kbd className="bg-white/[0.05] border border-white/[0.08] rounded px-1 py-0.5 font-mono">↑↓</kbd>
                      navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="bg-white/[0.05] border border-white/[0.08] rounded px-1 py-0.5 font-mono">↵</kbd>
                      open
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="bg-white/[0.05] border border-white/[0.08] rounded px-1 py-0.5 font-mono">esc</kbd>
                      close
                    </span>
                  </div>
                  <button onClick={goFullSearch}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground/30 hover:text-orange-400 transition-colors group">
                    Advanced search
                    <ArrowUpRight className="w-3 h-3 group-hover:translate-x-px group-hover:-translate-y-px transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
