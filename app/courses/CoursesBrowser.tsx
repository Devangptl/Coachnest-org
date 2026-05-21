"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, BookOpen, X } from "lucide-react";
import CourseCard from "@/components/CourseCard";
import GlassCard from "@/components/GlassCard";

export interface CourseVM {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  instructorName: string;
  instructorId: string;
  instructorAvatar: string | null;
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
    <div className="pb-28">
      <div className="mb-5">
        <p className="text-muted-foreground text-sm">
          {filtered.length} course{filtered.length !== 1 ? "s" : ""}
          {q.trim() && (
            <>
              {" "}
              matching <span className="text-foreground">“{q.trim()}”</span>
            </>
          )}
        </p>
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
              instructorId={c.instructorId}
              instructorAvatar={c.instructorAvatar}
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

      {/* ── Floating search bar ─────────────────────────────────────────── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none w-[calc(100%-2rem)] max-w-3xl">
        <motion.div
          initial={{ y: 28, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="w-full flex items-center bg-background/80 backdrop-blur-2xl border border-border/60 shadow-[0_2px_12px_rgba(0,0,0,0.12)] rounded-full p-1.5 pointer-events-auto"
        >
          <div className="flex items-center gap-2 flex-1 px-4 min-w-0">
            <Search className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search courses or instructors…"
              aria-label="Search courses or instructors"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/35 focus:outline-none min-w-0 py-2"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="text-muted-foreground/40 hover:text-foreground transition-colors flex-shrink-0"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
