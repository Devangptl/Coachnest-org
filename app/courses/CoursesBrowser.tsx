"use client";

import { useMemo, useState } from "react";
import { Search, BookOpen } from "lucide-react";
import CourseCard from "@/components/CourseCard";
import GlassCard from "@/components/GlassCard";

export interface CourseVM {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  instructorName: string;
  price: number | null;
  discountPrice: number | null;
  isFree: boolean;
  level: string;
  totalLessons: number;
  enrollmentCount: number;
  avgRating: number;
  reviewCount: number;
  categoryName: string | null;
}

export default function CoursesBrowser({ courses }: { courses: CourseVM[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return courses;
    return courses.filter((c) =>
      [c.title, c.description, c.instructorName, c.categoryName ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [q, courses]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <p className="text-muted-foreground text-sm">
          {filtered.length} course{filtered.length !== 1 ? "s" : ""}
          {q.trim() && (
            <>
              {" "}
              matching <span className="text-foreground">“{q.trim()}”</span>
            </>
          )}
        </p>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="input-glass pl-9 w-full"
            placeholder="Search courses or instructors…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search courses or instructors"
          />
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((c) => (
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
              avgRating={c.avgRating}
              reviewCount={c.reviewCount}
              compact
            />
          ))}
        </div>
      ) : (
        <GlassCard className="text-center py-20">
          <BookOpen className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-white text-xl font-semibold mb-2">
            No courses found
          </h3>
          <p className="text-muted-foreground">
            {q.trim()
              ? "Try a different course title or instructor name."
              : "Check back soon — new courses are added regularly."}
          </p>
        </GlassCard>
      )}
    </div>
  );
}
