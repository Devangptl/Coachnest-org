"use client";

/**
 * InstructorPicker
 * Shown during student onboarding to optionally follow instructors.
 *
 * Props:
 *   popularInstructors – top-5 instructors preloaded by the server
 *   selectedIds        – currently selected instructor IDs
 *   onToggle           – toggle follow/unfollow for an instructor
 */

import { useState, useEffect, useRef } from "react";
import { Search, Check, BookOpen, Users, Loader2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface InstructorData {
  id:           string;
  name:         string;
  avatar:       string | null;
  headline:     string | null;
  courseCount:  number;
  studentCount: number;
}

interface InstructorPickerProps {
  popularInstructors: InstructorData[];
  selectedIds:        string[];
  onToggle:           (id: string) => void;
}

export default function InstructorPicker({
  popularInstructors,
  selectedIds,
  onToggle,
}: InstructorPickerProps) {
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState<InstructorData[]>(popularInstructors);
  const [loading,  setLoading]  = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search: reset to popular on empty query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults(popularInstructors);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/onboarding/instructors?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.instructors ?? []);
      } catch {
        // keep previous results on network error
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, popularInstructors]);

  return (
    <div className="space-y-5">

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search instructors…"
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 pl-10
                     text-sm text-foreground placeholder:text-muted-foreground/50
                     focus:outline-none focus:border-orange-400/40 transition-colors"
        />
        {loading && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 animate-spin" />
        )}
      </div>

      {/* Selected count */}
      {selectedIds.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedIds.length} instructor{selectedIds.length > 1 ? "s" : ""} selected
        </p>
      )}

      {/* Instructor list */}
      {results.length > 0 ? (
        <div className="space-y-2.5">
          {results.map((instructor) => (
            <InstructorCard
              key={instructor.id}
              instructor={instructor}
              selected={selectedIds.includes(instructor.id)}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-sm text-muted-foreground">
          No instructors found{query ? ` for "${query}"` : ""}.
        </div>
      )}

      {/* Label */}
      {!query && results.length > 0 && (
        <p className="text-xs text-muted-foreground/60 text-center">
          Showing popular instructors · search to find more
        </p>
      )}
    </div>
  );
}

// ── Instructor card ────────────────────────────────────────────────────────────

function InstructorCard({
  instructor,
  selected,
  onToggle,
}: {
  instructor: InstructorData;
  selected:   boolean;
  onToggle:   (id: string) => void;
}) {
  const initials = instructor.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <button
      type="button"
      onClick={() => onToggle(instructor.id)}
      className={cn(
        "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all text-left",
        selected
          ? "bg-orange-500/10 border-orange-500/30"
          : "bg-secondary border-border hover:border-orange-400/20 hover:bg-secondary/80"
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0 w-11 h-11 rounded-full overflow-hidden bg-muted">
        {instructor.avatar ? (
          <Image
            src={instructor.avatar}
            alt={instructor.name}
            fill
            className="object-cover"
            sizes="44px"
            unoptimized
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
            {initials}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-semibold text-sm truncate",
          selected ? "text-orange-400" : "text-foreground"
        )}>
          {instructor.name}
        </p>
        {instructor.headline && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {instructor.headline}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/70">
            <BookOpen className="w-3 h-3" />
            {instructor.courseCount} course{instructor.courseCount !== 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/70">
            <Users className="w-3 h-3" />
            {instructor.studentCount.toLocaleString()} student{instructor.studentCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Check indicator */}
      <div className={cn(
        "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
        selected
          ? "bg-orange-500 border-orange-500"
          : "border-border bg-transparent"
      )}>
        {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
      </div>
    </button>
  );
}
