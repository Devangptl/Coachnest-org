/**
 * CourseCard — displays a course in a glassmorphism card.
 * Supports price display, ratings, levels, and progress tracking.
 */
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Users, Star } from "lucide-react";
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

  return (
    <Link href={`/courses/${id}`} className="group block">
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-xl transition-all duration-300 group-hover:bg-white/[0.15] group-hover:border-white/30 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-orange-600/15 h-full flex flex-col">
        {/* Thumbnail */}
        <div className="relative h-44 bg-gradient-to-br from-orange-700/50 to-orange-700/50 overflow-hidden flex-shrink-0">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/40 to-orange-600/40 flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-white/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Top badges */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            {isFree && <Badge variant="green">Free</Badge>}
            {level && (
              <Badge variant={LEVEL_COLORS[level as keyof typeof LEVEL_COLORS] ?? "gray"} className="capitalize">
                {level}
              </Badge>
            )}
          </div>

          {/* Bottom badges */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm border border-border rounded-lg px-2 py-1">
              <BookOpen className="w-3 h-3 text-orange-300" />
              <span className="text-white text-xs font-medium">
                {totalLessons} lesson{totalLessons !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Price tag */}
          {!isFree && price != null && (
            <div className="absolute bottom-3 right-3 bg-card backdrop-blur-sm border border-border rounded-lg px-2.5 py-1">
              {hasDiscount ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-bold text-sm">
                    ₹{discountPrice!.toLocaleString("en-IN")}
                  </span>
                  <span className="text-muted-foreground/70 text-xs line-through">
                    ₹{price.toLocaleString("en-IN")}
                  </span>
                </div>
              ) : (
                <span className="text-white font-bold text-sm">
                  ₹{price.toLocaleString("en-IN")}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col">
          <h3 className="text-white font-semibold text-base mb-1 line-clamp-2 group-hover:text-orange-300 transition-colors">
            {title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 flex-1">
            {truncate(description, 90)}
          </p>

          {/* Instructor */}
          {instructorName && (
            <p className="text-muted-foreground/70 text-xs mt-2">by {instructorName}</p>
          )}

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
              {avgRating != null && avgRating > 0 && (
                <span className="flex items-center gap-1 text-amber-400">
                  <Star className="w-3 h-3 fill-current" />
                  {avgRating}
                  {reviewCount != null && (
                    <span className="text-white/30">({reviewCount})</span>
                  )}
                </span>
              )}
              {enrollmentCount != null && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {enrollmentCount.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Progress bar — only for enrolled courses */}
          {progress !== undefined && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground text-xs">Progress</span>
                <span className="text-orange-400 text-xs font-medium">{progress}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-600 to-orange-500 rounded-full transition-all"
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
