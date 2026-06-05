import Link from "next/link";
import Image from "next/image";
import { BookOpen, Star, Users } from "lucide-react";

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
  beginner:     "text-emerald-400 bg-emerald-500/10",
  intermediate: "text-blue-400 bg-blue-500/10",
  advanced:     "text-purple-400 bg-purple-500/10",
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
  const levelColor = LEVEL_COLORS[levelKey] ?? "text-muted-foreground bg-secondary";

  return (
    <Link
      href={`/courses/${id}`}
      className="group flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-[#ea580c]/35 hover:bg-card/80 transition-all duration-200"
    >
      {/* Thumbnail */}
      <div className="relative w-[72px] h-[54px] sm:w-[80px] sm:h-[60px] md:w-[96px] md:h-[72px] flex-shrink-0 rounded-lg overflow-hidden bg-secondary">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-muted-foreground/40 group-hover:text-[#ea580c]/50 transition-colors" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <h3 className="text-[13px] sm:text-sm md:text-base font-medium text-foreground leading-snug line-clamp-1 group-hover:text-[#ea580c] transition-colors duration-150">
          {title}
        </h3>

        <div className="flex items-center gap-2 flex-wrap">
          {avgRating > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-[11px] font-semibold text-amber-400">{avgRating.toFixed(1)}</span>
            </span>
          )}
          <span className="flex items-center gap-0.5 text-muted-foreground">
            <Users className="w-3 h-3" />
            <span className="text-[11px]">{enrollmentCount > 0 ? enrollmentCount.toLocaleString() : "0"}</span>
          </span>
          {instructorName && (
            <span className="text-[11px] text-muted-foreground truncate hidden sm:block">
              · {instructorName}
            </span>
          )}
          {level && (
            <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${levelColor}`}>
              {level}
            </span>
          )}
        </div>
      </div>

      {/* Price */}
      <div className="flex-shrink-0 flex flex-col items-end gap-0.5 ml-1">
        {isFree ? (
          <span className="text-[13px] font-bold text-emerald-400">Free</span>
        ) : displayPrice != null ? (
          <>
            <span className="text-[13px] font-bold text-foreground">
              ₹{displayPrice.toLocaleString("en-IN")}
            </span>
            {hasDiscount && (
              <span className="text-[10px] text-muted-foreground line-through">
                ₹{Number(price).toLocaleString("en-IN")}
              </span>
            )}
          </>
        ) : null}
      </div>
    </Link>
  );
}
