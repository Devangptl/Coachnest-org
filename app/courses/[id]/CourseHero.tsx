"use client";

import { motion } from "framer-motion";
import { BookOpen, Clock, Users, Star, Signal, Globe, Play, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

interface Props {
  title: string;
  description: string;
  thumbnail: string | null;
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

const levelConfig: Record<string, { variant: "green" | "amber" | "red"; icon: string }> = {
  beginner: { variant: "green", icon: "Beginner" },
  intermediate: { variant: "amber", icon: "Intermediate" },
  advanced: { variant: "red", icon: "Advanced" },
};

export default function CourseHero({
  title,
  description,
  thumbnail,
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

  return (
    <div className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-orange-700/10 to-orange-500/10" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-6">
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

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Left: Course info */}
          <motion.div
            className="flex-1 min-w-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <Badge variant={lvl.variant}>
                <Signal className="w-3 h-3" />
                {lvl.icon}
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
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-4 max-w-2xl">
              {description}
            </p>

            {/* Rating + meta */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {avgRating > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold text-lg">{avgRating.toFixed(1)}</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(avgRating)
                            ? "fill-amber-400 text-amber-400"
                            : i < avgRating
                            ? "fill-amber-400/50 text-amber-400"
                            : "fill-transparent text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-muted-foreground/70 text-sm">({reviewCount} reviews)</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Users className="w-4 h-4" />
                {enrollmentCount.toLocaleString()} students
              </div>
            </div>

            {/* Instructor */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                {instructorName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-muted-foreground/70 text-[10px]">Created by</p>
                <p className="text-foreground font-medium text-xs">{instructorName}</p>
              </div>
            </div>
          </motion.div>

          {/* Right: Thumbnail preview */}
          <motion.div
            className="lg:w-[360px] flex-shrink-0"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-orange-700/30 to-orange-700/30 border border-border shadow-xl shadow-orange-600/15 group">
              {thumbnail ? (
                <Image
                  src={thumbnail}
                  alt={title}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <BookOpen className="w-20 h-20 text-muted-foreground/20" />
                </div>
              )}
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                  <Play className="w-7 h-7 text-[#fff] ml-1" />
                </div>
              </div>
            </div>

            {/* Quick stats under thumbnail */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="backdrop-blur-md bg-secondary border border-border rounded-lg px-2 py-2 text-center">
                <BookOpen className="w-3.5 h-3.5 text-orange-400 mx-auto mb-0.5" />
                <p className="text-foreground font-semibold text-xs">{lessonCount}</p>
                <p className="text-muted-foreground/70 text-[9px]">Lessons</p>
              </div>
              <div className="backdrop-blur-md bg-secondary border border-border rounded-lg px-2 py-2 text-center">
                <Clock className="w-3.5 h-3.5 text-blue-400 mx-auto mb-0.5" />
                <p className="text-foreground font-semibold text-xs">
                  {totalDuration > 60
                    ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`
                    : `${totalDuration}m`}
                </p>
                <p className="text-muted-foreground/70 text-[9px]">Duration</p>
              </div>
              <div className="backdrop-blur-md bg-secondary border border-border rounded-lg px-2 py-2 text-center">
                <Users className="w-3.5 h-3.5 text-green-400 mx-auto mb-0.5" />
                <p className="text-foreground font-semibold text-xs">{enrollmentCount}</p>
                <p className="text-muted-foreground/70 text-[9px]">Students</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom separator */}
      <div className="h-px bg-border" />
    </div>
  );
}
