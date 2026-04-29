"use client";

/**
 * RecommendedCourses
 * Fetches /api/recommendations on mount and renders a course section.
 * - Personalised match  → "Recommended For You" with "Based on: …" label
 * - No professions set  → "Popular Courses" (fallback to top-enrolled)
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, TrendingUp, ArrowRight } from "lucide-react";
import CourseCard from "@/components/CourseCard";

interface Course {
  id:             string;
  title:          string;
  description:    string;
  thumbnail:      string | null;
  price:          number | null;
  discountPrice:  number | null;
  isFree:         boolean;
  level:          string;
  instructorName: string;
  enrollmentCount: number;
  totalLessons:   number;
  avgRating:      number | null;
  reviewCount:    number | null;
}

export default function RecommendedCourses() {
  const [courses,         setCourses]         = useState<Course[]>([]);
  const [basedOn,         setBasedOn]         = useState<string[]>([]);
  const [isPersonalized,  setIsPersonalized]  = useState(false);
  const [loading,         setLoading]         = useState(true);

  useEffect(() => {
    fetch("/api/recommendations?limit=6")
      .then((r) => r.json())
      .then((data) => {
        setCourses(data.courses        ?? []);
        setBasedOn(data.basedOn        ?? []);
        setIsPersonalized(data.isPersonalized ?? false);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonSection />;
  if (courses.length === 0) return null;

  const Icon  = isPersonalized ? Sparkles   : TrendingUp;
  const title = isPersonalized ? "Recommended For You" : "Popular Courses";

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-orange-400" />
          <div>
            <h2 className="text-xl font-semibold text-foreground leading-none">
              {title}
            </h2>
            {isPersonalized && basedOn.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Based on: {basedOn.join(", ")}
              </p>
            )}
          </div>
        </div>
        <Link
          href="/courses"
          className="text-orange-400 hover:text-orange-300 text-sm font-medium
                     flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {courses.map((c) => (
          <CourseCard
            key={c.id}
            id={c.id}
            title={c.title}
            description={c.description}
            thumbnail={c.thumbnail}
            instructorName={c.instructorName}
            price={c.price}
            discountPrice={c.discountPrice}
            isFree={c.isFree}
            level={c.level}
            totalLessons={c.totalLessons}
            enrollmentCount={c.enrollmentCount}
            avgRating={c.avgRating ?? undefined}
            reviewCount={c.reviewCount ?? undefined}
            compact
          />
        ))}
      </div>
    </section>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonSection() {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-5 h-5 rounded bg-secondary animate-pulse" />
        <div className="w-48 h-6 rounded bg-secondary animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-md border border-border/60 overflow-hidden bg-card">
            <div className="h-[100px] bg-secondary animate-pulse" />
            <div className="p-2 space-y-1.5">
              <div className="w-3/4 h-3 rounded bg-secondary animate-pulse" />
              <div className="w-full h-2.5 rounded bg-secondary animate-pulse" />
              <div className="w-1/2 h-2.5 rounded bg-secondary animate-pulse mt-2" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
