import Link from "next/link";
import { Users, Star, Clock } from "lucide-react";
import { truncate } from "@/lib/utils";
import { Badge } from "./ui/Badge";
import InstructorHoverCard from "./InstructorHoverCard";
import InstructorAvatar from "./InstructorAvatar";
import Thumbnail from "./Thumbnail";
import ShareCourseModal from "./ShareCourseModal";

interface CourseCardProps {
  id:               string;
  title:            string;
  description:      string;
  thumbnail?:       string | null;
  instructorName?:  string;
  instructorId?:    string;
  instructorAvatar?: string | null;
  price?:           number | null;
  discountPrice?:   number | null;
  isFree?:          boolean;
  level?:           string;
  totalLessons?:    number;
  enrollmentCount?: number;
  avgRating?:       number;
  reviewCount?:     number;
  progress?:        number;
  compact?:         boolean;
}

const LEVEL_COLORS = {
  beginner:     "green"  as const,
  intermediate: "amber"  as const,
  advanced:     "red"    as const,
};

export default function CourseCard({
  id, title, description, thumbnail, instructorName,
  instructorId, instructorAvatar,
  price, discountPrice, isFree, level, totalLessons = 0,
  enrollmentCount, avgRating, reviewCount, progress,
  compact = false,
}: CourseCardProps) {
  const hasDiscount = discountPrice != null && price != null && discountPrice < price;
  const discountPct = hasDiscount
    ? Math.round((1 - discountPrice! / price!) * 100)
    : 0;

  return (
    <div className="relative group block h-full">
      <Link href={`/courses/${id}`} className="block h-full">
      <div className="relative bg-card border border-border/60 rounded-md overflow-hidden transition-colors duration-300 group-hover:border-orange-500/30 h-full flex flex-col">

        {/* Top orange accent line */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-orange-600 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />

        {/* ── Thumbnail ─────────────────────────────────────── */}
        <Thumbnail
          src={thumbnail ?? undefined}
          alt={title}
          className="rounded-none ring-0 shadow-none hover:shadow-none hover:ring-0 hover:translate-y-0"
          sizes={compact ? "200px" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
        >
          {/* Top-left: level badge */}
          {level && !compact && (
            <div className="absolute top-2 left-2">
              <Badge variant={LEVEL_COLORS[level as keyof typeof LEVEL_COLORS] ?? "gray"} className="capitalize">
                {level}
              </Badge>
            </div>
          )}

          {/* Discount badge — top right */}
          {hasDiscount && discountPct > 0 && (
            <div className={`absolute top-1.5 right-1.5 bg-orange-500 text-[#fff] font-bold rounded ${compact ? "text-[8px] px-1 py-px" : "text-[10px] px-2 py-0.5 rounded-md"}`}>
              -{discountPct}%
            </div>
          )}

          {/* Bottom-left — lesson count (non-compact only) */}
          {!compact && (
            <div className="absolute bottom-3 left-3">
              <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm border border-white/10 rounded-md px-2 py-1">
                <Clock className="w-3 h-3 text-orange-300" />
                <span className="text-[#fff] text-[11px] font-medium">
                  {totalLessons} lesson{totalLessons !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          )}

          {/* Bottom-right — price */}
          {!isFree && price != null && (
            <div className={`absolute right-1.5 bg-black/75 border border-white/10 rounded ${compact ? "bottom-1.5 px-1.5 py-px" : "bottom-3 px-2.5 py-1 rounded-md"}`}>
              {hasDiscount ? (
                <div className="flex items-center gap-1">
                  <span className={`text-[#fff] font-bold leading-none ${compact ? "text-[10px]" : "text-sm"}`}>
                    ₹{discountPrice!.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[#fff]/60 text-[8px] line-through leading-none">
                    ₹{price.toLocaleString("en-IN")}
                  </span>
                </div>
              ) : (
                <span className={`text-[#fff] font-bold leading-none ${compact ? "text-[10px]" : "text-sm"}`}>
                  ₹{price.toLocaleString("en-IN")}
                </span>
              )}
            </div>
          )}
        </Thumbnail>

        {/* ── Content ───────────────────────────────────────── */}
        <div className={`${compact ? "p-2" : "p-4"} flex-1 flex flex-col`}>

          {/* Instructor — non-compact only */}
          {instructorName && !compact && (
            instructorId ? (
              <div className="mb-1.5">
                <InstructorHoverCard
                  instructorId={instructorId}
                  instructorName={instructorName}
                  avatarUrl={instructorAvatar}
                  className="inline-flex items-center gap-1.5 text-muted-foreground/70 text-xs hover:text-orange-500 transition-colors max-w-full"
                >
                  <InstructorAvatar
                    name={instructorName}
                    avatar={instructorAvatar}
                    seed={instructorId}
                    size="w-5 h-5"
                  />
                  <span className="truncate">{instructorName}</span>
                </InstructorHoverCard>
              </div>
            ) : (
              <p className="text-muted-foreground/60 text-xs mb-1.5 truncate">
                by {instructorName}
              </p>
            )
          )}

          {/* Title */}
          <h3 className={`text-foreground font-semibold line-clamp-2 group-hover:text-orange-500 transition-colors leading-snug ${compact ? "text-[11px] mb-1" : "text-[15px] mb-2"}`}>
            {title}
          </h3>

          {/* Description — non-compact only */}
          {!compact && (
            <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2 flex-1">
              {truncate(description, 90)}
            </p>
          )}

          {/* ── Footer stats ──────────────────────────────── */}
          <div className={`flex items-center justify-between gap-1 ${compact ? "mt-1.5" : "mt-3 pt-3 border-t border-border/50"}`}>
            <div className={`flex items-center gap-1.5 text-muted-foreground/70 ${compact ? "text-[10px]" : "text-xs"}`}>
              {avgRating != null && avgRating > 0 && (
                <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                  <Star className={`${compact ? "w-2.5 h-2.5" : "w-3 h-3"} fill-current`} />
                  {avgRating}
                </span>
              )}
              {enrollmentCount != null && enrollmentCount > 0 && (
                <span className="flex items-center gap-0.5">
                  <Users className={`${compact ? "w-2.5 h-2.5" : "w-3 h-3"}`} />
                  {enrollmentCount.toLocaleString()}
                </span>
              )}
            </div>

            {isFree && (
              <span className={`font-semibold text-green-500 ${compact ? "text-[10px]" : "text-xs"}`}>Free</span>
            )}
          </div>

          {/* ── Progress bar ──────────────────────────────── */}
          {progress !== undefined && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-muted-foreground ${compact ? "text-[10px]" : "text-xs"}`}>Progress</span>
                <span className={`text-orange-500 font-semibold ${compact ? "text-[10px]" : "text-xs"}`}>{progress}%</span>
              </div>
              <div className="h-1 bg-secondary rounded-full overflow-hidden">
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

      {/* Share button — non-compact, shown on card hover, outside Link so it doesn't navigate */}
      {!compact && (
        <div className="absolute bottom-[3.75rem] right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <ShareCourseModal courseId={id} title={title} thumbnail={thumbnail} iconOnly triggerClassName="!w-7 !h-7 shadow-md bg-card/90 backdrop-blur-sm" />
        </div>
      )}
    </div>
  );
}
