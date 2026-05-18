"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Plus, Check, Loader2, BookOpen } from "lucide-react";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { formatMinutes } from "@/lib/utils";

interface Course {
  id: string;
  title: string;
  thumbnail: string | null;
  level: string;
  totalLessons: number;
  totalDuration: number;
  createdBy: { name: string };
  category: { name: string } | null;
}

const LEVELS = ["", "beginner", "intermediate", "advanced"] as const;

export default function AddCoursesModal({
  open,
  onOpenChange,
  playlistId,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  playlistId: string;
  onAdded: () => void;
}) {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchPage = useCallback(
    async (nextPage: number, replace: boolean) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          playlistId,
          page: String(nextPage),
        });
        if (q) params.set("q", q);
        if (level) params.set("level", level);
        const res = await fetch(`/api/playlists/course-search?${params}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setCourses((prev) => (replace ? data.courses : [...prev, ...data.courses]));
        setPage(data.page);
        setHasMore(data.hasMore);
      } catch {
        toast.error("Failed to load courses");
      } finally {
        setLoading(false);
      }
    },
    [playlistId, q, level],
  );

  // Reload on open + when filters change (debounced).
  useEffect(() => {
    if (!open) return;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchPage(1, true), 300);
    return () => clearTimeout(debounce.current);
  }, [open, q, level, fetchPage]);

  async function add(courseId: string) {
    if (busy) return;
    setBusy(courseId);
    try {
      const res = await fetch(`/api/playlists/${playlistId}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed");
      }
      setAdded((prev) => new Set(prev).add(courseId));
      onAdded();
      toast.success("Added to list");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add courses</DialogTitle>
          <DialogDescription>
            Search your published courses to add to this list. You can only
            add courses you created.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              autoFocus
              className="input-glass pl-9 w-full"
              placeholder="Search courses…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            className="input-glass sm:w-44"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            {LEVELS.map((l) => (
              <option key={l || "all"} value={l}>
                {l ? l[0].toUpperCase() + l.slice(1) : "All levels"}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
          {courses.map((c) => {
            const isAdded = added.has(c.id);
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card"
              >
                <div className="w-14 h-10 rounded bg-secondary overflow-hidden flex-shrink-0">
                  {c.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{c.title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.createdBy.name} · {c.totalLessons} lessons ·{" "}
                    {formatMinutes(c.totalDuration)}
                    {c.category ? ` · ${c.category.name}` : ""}
                  </div>
                </div>
                <button
                  onClick={() => add(c.id)}
                  disabled={isAdded || busy === c.id}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex-shrink-0 ${
                    isAdded
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-400 cursor-default"
                      : "border-border bg-secondary hover:border-orange-500/50 hover:text-foreground"
                  }`}
                >
                  {busy === c.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isAdded ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  {isAdded ? "Added" : "Add"}
                </button>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && courses.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No matching courses. Only your own published courses can be
              added to a playlist.
            </p>
          )}
          {hasMore && !loading && (
            <button
              onClick={() => fetchPage(page + 1, false)}
              className="w-full py-2 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg"
            >
              Load more
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
