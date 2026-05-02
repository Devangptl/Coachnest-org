"use client";

import { motion } from "framer-motion";
import { BookOpen, Clock, Users, Star, Signal, Globe, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

interface Props {
  title: string;
  description: string;
  level: string;
  language: string;
  categoryName: string | null;
  instructorName: string;
  lessonCount: number;
  totalDuration: number;
  enrollmentCount: number;
  reviewCount: number;
  avgRating: number;
  isFree: boolean;
}

const levelConfig: Record<string, { variant: "green" | "amber" | "red"; label: string }> = {
  beginner:     { variant: "green", label: "Beginner" },
  intermediate: { variant: "amber", label: "Intermediate" },
  advanced:     { variant: "red",   label: "Advanced" },
};

export default function CourseHero({
  title,
  description,
  level,
  language,
  categoryName,
  instructorName,
  lessonCount,
  totalDuration,
  enrollmentCount,
  reviewCount,
  avgRating,
  isFree,
}: Props) {
  const lvl = levelConfig[level] ?? levelConfig.beginner;

  const durationLabel = totalDuration > 60
    ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`
    : totalDuration > 0 ? `${totalDuration}m` : null;

  return (
    <div className="relative overflow-hidden border-b border-border">
      <div className="relative mx-auto py-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-3xl space-y-3"
        >
          {/* Row 1: Breadcrumb + badges on the same line */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
              <Link href="/" className="hover:text-muted-foreground transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <Link href="/courses" className="hover:text-muted-foreground transition-colors">Courses</Link>
              {categoryName && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-muted-foreground truncate max-w-[120px] sm:max-w-none">{categoryName}</span>
                </>
              )}
            </nav>

            {/* Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant={lvl.variant} className="text-[10px] px-1.5 py-0.5">
                <Signal className="w-2.5 h-2.5" />
                {lvl.label}
              </Badge>
              {isFree && <Badge variant="green" className="text-[10px] px-1.5 py-0.5">Free</Badge>}
              <Badge variant="gray" className="text-[10px] px-1.5 py-0.5">
                <Globe className="w-2.5 h-2.5" />
                {language}
              </Badge>
            </div>
          </div>

          {/* Row 2: Title */}
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground leading-snug">
            {title}
          </h1>

          {/* Row 3: Description — 2-line clamp */}
          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
            {description}
          </p>

          {/* Row 4: All meta in one compact line */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground/70">
            {/* Rating */}
            {avgRating > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-amber-400 font-semibold">{avgRating.toFixed(1)}</span>
                <span className="flex items-center gap-px">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < Math.floor(avgRating)
                          ? "fill-amber-400 text-amber-400"
                          : i < avgRating
                          ? "fill-amber-400/50 text-amber-400"
                          : "fill-transparent text-muted-foreground/25"
                      }`}
                    />
                  ))}
                </span>
                <span>({reviewCount.toLocaleString()})</span>
              </span>
            )}

            <Dot />
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {enrollmentCount.toLocaleString()} students
            </span>

            <Dot />
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {lessonCount} lessons
            </span>

            {durationLabel && (
              <>
                <Dot />
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {durationLabel}
                </span>
              </>
            )}

            <Dot />
            {/* Instructor */}
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#d97757] to-orange-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                {instructorName.charAt(0).toUpperCase()}
              </span>
              <span>{instructorName}</span>
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Dot() {
  return <span className="text-muted-foreground/30 select-none">·</span>;
}
