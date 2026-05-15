"use client";

import { motion } from "framer-motion";
import { BookOpen, Clock, Users, Star, Signal, Globe, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import FollowInstructorButton from "@/components/FollowInstructorButton";

interface Props {
  title: string;
  description: string;
  level: string;
  language: string;
  categoryName: string | null;
  instructorName: string;
  instructorId: string;
  lessonCount: number;
  totalDuration: number;
  enrollmentCount: number;
  reviewCount: number;
  avgRating: number;
  isFree: boolean;
  isFollowingInstructor: boolean;
  instructorFollowerCount: number;
  isLoggedIn: boolean;
}

const levelConfig: Record<string, { variant: "green" | "amber" | "red"; label: string }> = {
  beginner:     { variant: "green", label: "Beginner" },
  intermediate: { variant: "amber", label: "Intermediate" },
  advanced:     { variant: "red",   label: "Advanced" },
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: "easeOut", delay },
});

export default function CourseHero({
  title,
  description,
  level,
  language,
  categoryName,
  instructorName,
  instructorId,
  lessonCount,
  totalDuration,
  enrollmentCount,
  reviewCount,
  avgRating,
  isFree,
  isFollowingInstructor,
  instructorFollowerCount,
  isLoggedIn,
}: Props) {
  const lvl = levelConfig[level] ?? levelConfig.beginner;

  const durationLabel =
    totalDuration > 60
      ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`
      : `${totalDuration}m`;

  return (
    /* Break out of MainWrapper's horizontal padding for full-bleed background */
    <div className="relative overflow-hidden -mx-3 sm:-mx-5 lg:-mx-7">

      {/* ── Dark gradient background ── */}
      <div className="absolute inset-0 bg-hero-gradient" />

      {/* ── Decorative blur glows ── */}
      <div className="absolute -top-40 -right-20 w-[480px] h-[480px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-[320px] h-[320px] rounded-full bg-orange-600/6 blur-[80px] pointer-events-none" />

      {/* ── Subtle dot-grid texture ── */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* ── Content — re-apply the same horizontal padding as MainWrapper ── */}
      <div className="relative px-3 sm:px-5 lg:px-7 pt-7 pb-10">

        {/* Breadcrumb */}
        <motion.nav
          {...fadeUp()}
          className="flex items-center gap-1.5 text-[11px] text-white/35 mb-5 select-none"
        >
          <Link href="/" className="hover:text-white/65 transition-colors duration-150">
            Home
          </Link>
          <ChevronRight className="w-3 h-3 flex-shrink-0" />
          <Link href="/courses" className="hover:text-white/65 transition-colors duration-150">
            Courses
          </Link>
          {categoryName && (
            <>
              <ChevronRight className="w-3 h-3 flex-shrink-0" />
              <span className="text-white/55 truncate max-w-[180px]">{categoryName}</span>
            </>
          )}
        </motion.nav>

        <div className="max-w-3xl">

          {/* ── Badges ── */}
          <motion.div {...fadeUp(0.04)} className="flex flex-wrap gap-2 mb-4">
            <Badge variant={lvl.variant}>
              <Signal className="w-3 h-3" />
              {lvl.label}
            </Badge>
            {categoryName && <Badge variant="purple">{categoryName}</Badge>}
            {isFree && <Badge variant="green">Free</Badge>}
            <Badge variant="gray">
              <Globe className="w-3 h-3" />
              {language}
            </Badge>
          </motion.div>

          {/* ── Title ── */}
          <motion.h1
            {...fadeUp(0.08)}
            className="text-2xl sm:text-3xl lg:text-[2.45rem] font-bold text-white leading-[1.18] tracking-tight mb-4"
          >
            {title}
          </motion.h1>

          {/* ── Description ── */}
          <motion.div
            {...fadeUp(0.12)}
            className="text-sm sm:text-[0.9375rem] text-white/65 mb-7 leading-relaxed"
          >
            <MarkdownRenderer content={description} compact />
          </motion.div>

          {/* ── Stats row ── */}
          <motion.div
            {...fadeUp(0.16)}
            className="flex flex-wrap items-center gap-x-5 gap-y-3 mb-7"
          >
            {avgRating > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold text-lg leading-none tabular-nums">
                    {avgRating.toFixed(1)}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(avgRating)
                            ? "fill-amber-400 text-amber-400"
                            : i < avgRating
                            ? "fill-amber-400/50 text-amber-400"
                            : "fill-transparent text-white/20"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-white/40 text-xs">
                    ({reviewCount.toLocaleString()})
                  </span>
                </div>

                <div className="hidden sm:block w-px h-4 bg-white/10 flex-shrink-0" />
              </>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
              <div className="flex items-center gap-1.5 text-white/55 text-sm">
                <Users className="w-3.5 h-3.5 text-white/35" />
                <span>{enrollmentCount.toLocaleString()} students</span>
              </div>

              <div className="flex items-center gap-1.5 text-white/55 text-sm">
                <BookOpen className="w-3.5 h-3.5 text-white/35" />
                <span>{lessonCount} lessons</span>
              </div>

              {totalDuration > 0 && (
                <div className="flex items-center gap-1.5 text-white/55 text-sm">
                  <Clock className="w-3.5 h-3.5 text-white/35" />
                  <span>{durationLabel} total</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Instructor strip ── */}
          <motion.div
            {...fadeUp(0.2)}
            className="flex items-center gap-4 flex-wrap pt-5 border-t border-white/[0.08]"
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-orange-400 to-amber-500 flex items-center justify-center text-white text-sm font-bold shadow-lg ring-2 ring-white/10">
                  {instructorName.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[#0f0f0f]" />
              </div>

              {/* Name */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/35 font-medium mb-0.5">
                  Created by
                </p>
                <p className="text-white font-semibold text-sm leading-tight">
                  {instructorName}
                </p>
              </div>
            </div>

            <FollowInstructorButton
              instructorId={instructorId}
              initialIsFollowing={isFollowingInstructor}
              initialCount={instructorFollowerCount}
              isLoggedIn={isLoggedIn}
              showCount
            />
          </motion.div>

        </div>
      </div>

      {/* ── Bottom edge — gradient fade instead of hard line ── */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}
