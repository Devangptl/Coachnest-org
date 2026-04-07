/**
 * CourseCard — displays a course in a clean, modern card.
 * Supports price display, ratings, levels, and progress tracking.
 */
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Users, Star, Clock } from "lucide-react";
import { truncate } from "@/lib/utils";
import { Badge } from "./ui/Badge";

interface CourseCardProps {
  id:               string;
  title:            string;
  description:      string;
  thumbnail?:       string | null;
  instructorName?:  string;
  price?:           number | null;
  discountPrice?:   number | null;
  isFree?:          boolean;
  level?:           string;
  totalLessons?:    number;
  enrollmentCount?: number;
  avgRating?:       number;
  reviewCount?:     number;
  progress?:        number; // 0-100, shown if the user is enrolled
}

const LEVEL_COLORS = {
  beginner:     "green"  as const,
  intermediate: "amber"  as const,
  advanced:     "red"    as const,
};

export default function CourseCard({
  id, title, description, thumbnail, instructorName,
  price, discountPrice, isFree, level, totalLessons = 0,
  enrollmentCount, avgRating, reviewCount, progress,
}: CourseCardProps) {
  const hasDiscount = discountPrice != null && price != null && discountPrice < price;
  const discountPct = hasDiscount
    ? Math.round((1 - discountPrice! / price!) * 100)
    : 0;

  return (
    <Link href={`/courses/${id}`} className="group block h-full">
      <div className="relative bg-card border border-border/60 rounded-md overflow-hidden transition-all duration-300 group-hover:border-orange-500/30 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-orange-500/8 h-full flex flex-col">

        {/* Top orange accent line — appears on hover */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-orange-600 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />

        {/* ── Thumbnail ─────────────────────────────────────── */}
        <div className="relative h-44 bg-secondary overflow-hidden flex-shrink-0">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={title}
              fill
              className="object-cover transition-all duration-700 ease-out group-hover:scale-110 group-hover:brightness-110"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-orange-600/15 to-amber-500/20 flex items-center justify-center transition-all duration-700 group-hover:from-orange-500/30 group-hover:via-orange-600/25 group-hover:to-amber-500/30">
              <BookOpen className="w-12 h-12 text-orange-500/25 transition-all duration-500 group-hover:scale-110 group-hover:text-orange-500/40" />
            </div>
          )}
          {/* Scrim — brightens slightly on hover to lift image */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent transition-opacity duration-500 group-hover:opacity-80" />

          {/* Top-left badges */}
          <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
            {level && (
              <Badge variant={LEVEL_COLORS[level as keyof typeof LEVEL_COLORS] ?? "gray"} className="capitalize">
                {level}
              </Badge>
            )}
          </div>

          {/* Discount % badge — top right */}
          {hasDiscount && discountPct > 0 && (
            <div className="absolute top-3 right-3 bg-orange-500 text-[#fff] text-[10px] font-bold px-2 py-0.5 rounded-md">
              -{discountPct}%
            </div>
          )}

          {/* Bottom-left — lesson count */}
          <div className="absolute bottom-3 left-3">
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm border border-white/10 rounded-md px-2 py-1">
              <Clock className="w-3 h-3 text-orange-300" />
              <span className="text-[#fff] text-[11px] font-medium">
                {totalLessons} lesson{totalLessons !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Bottom-right — price */}
          {!isFree && price != null && (
            <div className="absolute bottom-3 right-3 bg-black/75 border border-white/10 rounded-md px-2.5 py-1">
              {hasDiscount ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[#fff] font-bold text-sm leading-none">
                    ₹{discountPrice!.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[#fff]/60 text-[10px] line-through leading-none">
                    ₹{price.toLocaleString("en-IN")}
                  </span>
                </div>
              ) : (
                <span className="text-[#fff] font-bold text-sm leading-none">
                  ₹{price.toLocaleString("en-IN")}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Content ───────────────────────────────────────── */}
        <div className="p-4 flex-1 flex flex-col">

          {/* Instructor */}
          {instructorName && (
            <p className="text-muted-foreground/60 text-xs mb-1.5 truncate">
              by {instructorName}
            </p>
          )}

          {/* Title */}
          <h3 className="text-foreground font-semibold text-[15px] mb-2 line-clamp-2 group-hover:text-orange-500 transition-colors leading-snug">
            {title}
          </h3>

          {/* Description */}
          <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2 flex-1">
            {truncate(description, 90)}
          </p>

          {/* ── Footer stats ──────────────────────────────── */}
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
              {avgRating != null && avgRating > 0 && (
                <span className="flex items-center gap-1 text-amber-500 font-medium">
                  <Star className="w-3 h-3 fill-current" />
                  {avgRating}
                  {reviewCount != null && (
                    <span className="text-muted-foreground/50 font-normal">({reviewCount})</span>
                  )}
                </span>
              )}
              {enrollmentCount != null && enrollmentCount > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {enrollmentCount.toLocaleString()}
                </span>
              )}
            </div>

            {/* Free pill or price hint when no thumbnail price */}
            {isFree && (
              <span className="text-xs font-semibold text-green-600 dark:text-green-400">Free</span>
            )}
          </div>

          {/* ── Progress bar ──────────────────────────────── */}
          {progress !== undefined && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-muted-foreground text-xs">Progress</span>
                <span className="text-orange-500 text-xs font-semibold">{progress}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-600 to-amber-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
