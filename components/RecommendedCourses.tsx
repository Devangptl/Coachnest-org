"use client";

/**
 * RecommendedCourses
 * Fetches /api/recommendations on mount and renders a "For You" section.
 * Displayed on the student dashboard when the user has professions set.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Loader2, BookOpen } from "lucide-react";
import CourseCard from "@/components/CourseCard";
import GlassCard from "@/components/GlassCard";

interface Course {
  id:          string;
  title:       string;
  description: string;
  thumbnail:   string | null;
  _count:      { lessons: number; enrollments: number };
}

export default function RecommendedCourses() {
  const [courses,  setCourses]  = useState<Course[]>([]);
  const [basedOn,  setBasedOn]  = useState<string[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch("/api/recommendations?limit=6")
      .then((r) => r.json())
      .then((data) => {
        setCourses(data.courses ?? []);
        setBasedOn(data.basedOn  ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="w-5 h-5 text-orange-400" />
          <h2 className="text-xl font-semibold text-foreground">Recommended For You</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      </section>
    );
  }

  if (courses.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-400" />
          <div>
            <h2 className="text-xl font-semibold text-foreground leading-none">
              Recommended For You
            </h2>
            {basedOn.length > 0 && (
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.map((c) => (
          <CourseCard
            key={c.id}
            id={c.id}
            title={c.title}
            description={c.description}
            thumbnail={c.thumbnail}
            totalLessons={c._count.lessons}
          />
        ))}
      </div>
    </section>
  );
}
