"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GraduationCap, Clock, Users, BookOpen, Search, X } from "lucide-react";

type ClassItem = {
  id: string;
  status: string;
  progressPct: number;
  name: string;
  slug: string;
  thumbnail: string | null;
  instructorName: string;
  courses: number;
  students: number;
};

type Filter = "all" | "in-progress" | "completed" | "not-started";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "in-progress", label: "In progress" },
  { id: "completed", label: "Completed" },
  { id: "not-started", label: "Not started" },
];

export default function ClassesBrowser({ items }: { items: ClassItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const pending = useMemo(
    () => items.filter((e) => e.status !== "APPROVED"),
    [items],
  );
  const approved = useMemo(
    () => items.filter((e) => e.status === "APPROVED"),
    [items],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return approved.filter((e) => {
      if (q && !e.name.toLowerCase().includes(q) && !e.instructorName.toLowerCase().includes(q)) {
        return false;
      }
      if (filter === "completed") return e.progressPct >= 100;
      if (filter === "not-started") return e.progressPct === 0;
      if (filter === "in-progress") return e.progressPct > 0 && e.progressPct < 100;
      return true;
    });
  }, [approved, query, filter]);

  if (items.length === 0) {
    return (
      <div className="glass p-12 rounded-xl text-center">
        <GraduationCap className="w-16 h-16 text-amber-400/30 mx-auto mb-3" />
        <h2 className="text-lg font-semibold mb-1">No classes yet</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Browse available classes to join your first cohort.
        </p>
        <Link href="/classes" className="inline-block btn-primary px-4 py-2 rounded-lg text-sm">
          Browse classes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((e) => (
              <div key={e.id} className="glass p-3 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{e.name}</div>
                  <div className="text-xs text-muted-foreground">{e.status} · {e.instructorName}</div>
                </div>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-400/30">
                  {e.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {approved.length > 0 && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by class or instructor…"
                className="input-glass w-full pl-9 pr-9"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${
                    filter === f.id
                      ? "bg-amber-500/10 text-foreground border-amber-400/30"
                      : "text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="glass p-10 rounded-xl text-center">
              <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No classes match your search.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map((e) => (
                <Link
                  key={e.id}
                  href={`/classes/${e.slug}`}
                  className="glass p-4 rounded-xl border border-transparent hover:border-amber-400/30 hover:-translate-y-0.5 transition-all duration-200"
                >
                  {e.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.thumbnail} alt="" className="w-full h-32 object-cover rounded-lg mb-3" />
                  ) : (
                    <div className="w-full h-32 rounded-lg mb-3 bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center">
                      <GraduationCap className="w-10 h-10 text-amber-400/60" />
                    </div>
                  )}
                  <h3 className="font-semibold truncate">{e.name}</h3>
                  <div className="text-xs text-muted-foreground mt-1 mb-2">by {e.instructorName}</div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {e.courses}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {e.students}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-1.5 mt-3 overflow-hidden">
                    <div
                      className="bg-amber-400 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, e.progressPct))}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {e.progressPct >= 100 ? "Completed" : `${e.progressPct}% complete`}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
