"use client";

import { motion } from "framer-motion";
import { BookOpen, Clock, Users, Star, Signal, Globe, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
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

  const durationLabel = totalDuration > 60
    ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`
    : `${totalDuration}m`;

  return (
    <div className="relative overflow-hidden">
      <div className="relative mx-auto pt-5 pb-6">

        {/* Breadcrumb */}
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 text-xs text-muted-foreground/70 mb-4"
        >
          <Link href="/" className="hover:text-muted-foreground transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/courses" className="hover:text-muted-foreground transition-colors">Courses</Link>
          {categoryName && (
            <>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-muted-foreground">{categoryName}</span>
            </>
          )}
        </motion.nav>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl"
        >
          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
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
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight mb-3">
            {title}
          </h1>

          {/* Description */}
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-5">
            {description}
          </p>

          {/* Rating + enrollment + quick stats */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-sm">
            {avgRating > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400 font-bold">{avgRating.toFixed(1)}</span>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < Math.floor(avgRating)
                          ? "fill-amber-400 text-amber-400"
                          : i < avgRating
                          ? "fill-amber-400/50 text-amber-400"
                          : "fill-transparent text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-muted-foreground/70 text-xs">({reviewCount} reviews)</span>
              </div>
            )}

            <div className="flex items-center gap-1 text-muted-foreground/70">
              <Users className="w-3.5 h-3.5" />
              <span>{enrollmentCount.toLocaleString()} students</span>
            </div>

            <div className="flex items-center gap-1 text-muted-foreground/70">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{lessonCount} lessons</span>
            </div>

            {totalDuration > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground/70">
                <Clock className="w-3.5 h-3.5" />
                <span>{durationLabel}</span>
              </div>
            )}
          </div>

          {/* Instructor */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d97757] to-orange-500 flex items-center justify-center text-white text-xs font-bold shadow-md flex-shrink-0">
                {instructorName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-muted-foreground/70 text-[10px]">Created by</p>
                <p className="text-foreground font-medium text-xs">{instructorName}</p>
              </div>
            </div>
            <FollowInstructorButton
              instructorId={instructorId}
              initialIsFollowing={isFollowingInstructor}
              initialCount={instructorFollowerCount}
              isLoggedIn={isLoggedIn}
              showCount
            />
          </div>
        </motion.div>
      </div>

      {/* Bottom separator */}
      <div className="h-px bg-border" />
    </div>
  );
}
