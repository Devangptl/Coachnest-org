import Link from "next/link";
import Image from "next/image";
import { BookOpen, Star, Users, ArrowRight } from "lucide-react";

interface FeaturedCourseCardProps {
  id: string;
  title: string;
  thumbnail?: string | null;
  instructorName?: string | null;
  isFree: boolean;
  level?: string | null;
  price?: number | null;
  discountPrice?: number | null;
  enrollmentCount: number;
  avgRating: number;
}

const LEVEL_COLORS: Record<string, string> = {
  beginner:     "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  intermediate: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  advanced:     "bg-purple-500/15 text-purple-400 border-purple-500/25",
};

export default function FeaturedCourseCard({
  id,
  title,
  thumbnail,
  instructorName,
  isFree,
  level,
  price,
  discountPrice,
  enrollmentCount,
  avgRating,
}: FeaturedCourseCardProps) {
  const hasDiscount = discountPrice != null && price != null && discountPrice < price;
  const displayPrice = hasDiscount ? discountPrice : price;
  const levelKey = level?.toLowerCase() ?? "";
  const levelColor = LEVEL_COLORS[levelKey] ?? "bg-secondary text-muted-foreground border-border";

  return (
    <Link
      href={`/courses/${id}`}
      className="group flex flex-col rounded-2xl bg-card border border-border overflow-hidden hover:border-[#ea580c]/40 hover:shadow-[0_8px_32px_-8px_rgba(234,88,12,0.18)] transition-all duration-300 hover:-translate-y-1"
    >
      {/* ── Thumbnail ─────────────────────────────────────────────── */}
      <div className="relative w-full aspect-video bg-secondary overflow-hidden">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a0f0a] to-secondary">
            <BookOpen className="w-10 h-10 text-muted-foreground/30 group-hover:text-[#ea580c]/40 transition-colors duration-300" />
          </div>
        )}

        {/* Scrim for badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Free badge */}
        {isFree && (
          <span className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow">
            Free
          </span>
        )}

        {/* Discount badge */}
        {hasDiscount && !isFree && (
          <span className="absolute top-3 left-3 bg-[#ea580c] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow">
            Sale
          </span>
        )}

        {/* Level badge */}
        {level && (
          <span className={`absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border backdrop-blur-sm ${levelColor}`}>
            {level}
          </span>
        )}
      </div>

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-4 sm:p-5">
        {/* Title */}
        <h3 className="text-sm sm:text-[15px] font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-[#ea580c] transition-colors duration-200 mb-2">
          {title}
        </h3>

        {/* Instructor */}
        {instructorName && (
          <p className="text-xs text-muted-foreground mb-3 truncate">
            by <span className="text-foreground/70">{instructorName}</span>
          </p>
        )}

        {/* Rating + Enrollment */}
        <div className="flex items-center gap-3 mb-4">
          {avgRating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-xs font-semibold text-amber-400">{avgRating.toFixed(1)}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span className="text-xs">{enrollmentCount > 0 ? enrollmentCount.toLocaleString() : "0"} students</span>
          </div>
        </div>

        {/* Footer — price + CTA */}
        <div className="mt-auto flex items-center justify-between gap-3 pt-3 border-t border-border">
          {/* Price */}
          <div className="flex items-baseline gap-1.5">
            {isFree ? (
              <span className="text-base font-bold text-emerald-400">Free</span>
            ) : displayPrice != null ? (
              <>
                <span className="text-base font-bold text-foreground">
                  ₹{displayPrice.toLocaleString("en-IN")}
                </span>
                {hasDiscount && (
                  <span className="text-xs text-muted-foreground line-through">
                    ₹{Number(price).toLocaleString("en-IN")}
                  </span>
                )}
              </>
            ) : null}
          </div>

          {/* CTA */}
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#ea580c] group-hover:gap-1.5 transition-all duration-200">
            Enroll <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
