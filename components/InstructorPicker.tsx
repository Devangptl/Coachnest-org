"use client";

/**
 * InstructorPicker
 * Shown during student onboarding to optionally follow instructors.
 * Each card shows the instructor's profile and a strip of their courses.
 */

import { useState, useEffect, useRef } from "react";
import { Search, Check, BookOpen, Users, Loader2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface CoursePreview {
  id:              string;
  title:           string;
  thumbnail:       string | null;
  price:           number | null;
  isFree:          boolean;
  level:           string;
  enrollmentCount: number;
}

export interface InstructorData {
  id:           string;
  name:         string;
  avatar:       string | null;
  headline:     string | null;
  courseCount:  number;
  studentCount: number;
  courses:      CoursePreview[];
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
        <div className="space-y-3">
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

      {!query && results.length > 0 && (
        <p className="text-xs text-muted-foreground/60 text-center">
          Showing popular instructors · search to find more
        </p>
      )}
    </div>
  );
}

// ── Level badge ────────────────────────────────────────────────────────────────

const LEVEL_STYLES: Record<string, string> = {
  beginner:     "bg-green-500/10  text-green-400  border-green-500/20",
  intermediate: "bg-amber-500/10  text-amber-400  border-amber-500/20",
  advanced:     "bg-red-500/10    text-red-400    border-red-500/20",
};

function LevelBadge({ level }: { level: string }) {
  const style = LEVEL_STYLES[level.toLowerCase()] ?? "bg-secondary text-muted-foreground border-border";
  return (
    <span className={cn("inline-block text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize", style)}>
      {level}
    </span>
  );
}

// ── Course mini-card ───────────────────────────────────────────────────────────

function CourseMiniCard({ course }: { course: CoursePreview }) {
  const priceLabel = course.isFree || !course.price
    ? "Free"
    : `₹${course.price.toLocaleString("en-IN")}`;

  return (
    <div className="flex-shrink-0 w-40 rounded-lg border border-border bg-background overflow-hidden">
      {/* Thumbnail */}
      <div className="relative w-full h-20 bg-muted">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            className="object-cover"
            sizes="160px"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="w-6 h-6 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-2 space-y-1.5">
        <p className="text-xs font-medium text-foreground leading-tight line-clamp-2">
          {course.title}
        </p>
        <div className="flex items-center justify-between gap-1">
          <LevelBadge level={course.level} />
          <span className={cn(
            "text-[10px] font-semibold",
            course.isFree || !course.price ? "text-green-400" : "text-foreground"
          )}>
            {priceLabel}
          </span>
        </div>
      </div>
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

  const extraCourses = instructor.courseCount - instructor.courses.length;

  return (
    <div className={cn(
      "rounded-xl border transition-all overflow-hidden",
      selected ? "border-orange-500/30 bg-orange-500/5" : "border-border bg-secondary"
    )}>
      {/* ── Header row ── */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0 w-11 h-11 rounded-full overflow-hidden bg-muted mt-0.5">
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

        {/* Name / headline / stats */}
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

        {/* Follow toggle */}
        <button
          type="button"
          onClick={() => onToggle(instructor.id)}
          className={cn(
            "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            selected
              ? "bg-orange-500 text-white hover:bg-orange-400"
              : "bg-background border border-border text-muted-foreground hover:border-orange-400/40 hover:text-foreground"
          )}
        >
          {selected && <Check className="w-3 h-3" strokeWidth={3} />}
          {selected ? "Following" : "Follow"}
        </button>
      </div>

      {/* ── Course strip ── */}
      {instructor.courses.length > 0 && (
        <div className="px-4 pb-4">
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
            {instructor.courses.map((course) => (
              <CourseMiniCard key={course.id} course={course} />
            ))}
            {extraCourses > 0 && (
              <div className="flex-shrink-0 w-40 rounded-lg border border-dashed border-border
                              flex items-center justify-center text-xs text-muted-foreground/60">
                +{extraCourses} more course{extraCourses > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
