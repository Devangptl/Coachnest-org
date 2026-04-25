import Link from "next/link";
import Image from "next/image";
import { BookOpen, Users, Star } from "lucide-react";

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

  return (
    <Link
      href={`/courses/${id}`}
      className="group flex items-center gap-3 p-2 pr-3 sm:pr-4 rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.05] hover:border-orange-500/40 transition-all duration-300 overflow-hidden relative hover:shadow-[0_4px_20px_-10px_rgba(249,115,22,0.2)] hover:-translate-y-0.5"
    >
      {/* Hover left border accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-500 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Glossy sweep effect */}
      <div className="absolute inset-0 -translate-x-[150%] group-hover:translate-x-[150%] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent transition-transform duration-1000 ease-in-out pointer-events-none" />

      {/* Thumbnail */}
      <div className="relative w-20 h-16 sm:w-24 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden bg-black/40 border border-white/5">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-900/20 to-black/40">
            <BookOpen className="w-5 h-5 text-white/20 group-hover:text-orange-400/50 transition-colors" />
          </div>
        )}
        
        {isFree && (
          <div className="absolute top-1 left-1 bg-emerald-500/90 backdrop-blur-md text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shadow-sm">
            Free
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center h-full py-0.5">
        <h3 className="text-white/90 font-medium text-[13px] sm:text-[14px] leading-snug line-clamp-2 group-hover:text-orange-400 transition-colors mb-1">
          {title}
        </h3>
        
        <div className="mt-auto flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            {instructorName && (
              <p className="text-white/40 text-[11px] truncate">
                {instructorName}
              </p>
            )}
            {level && (
              <span className="text-white/20 text-[10px] font-medium uppercase tracking-wider shrink-0">
                • {level}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
             {avgRating > 0 && (
                <div className="flex items-center gap-0.5 text-[10px]">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-amber-400 font-medium">{avgRating.toFixed(1)}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-[10px] text-white/30">
                <Users className="w-3 h-3" />
                <span>{enrollmentCount > 0 ? enrollmentCount.toLocaleString() : "0"}</span>
              </div>
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="flex flex-col items-end justify-center shrink-0 ml-1">
        {isFree ? (
          <span className="text-emerald-400 text-[13px] font-bold">Free</span>
        ) : price != null ? (
          <div className="flex flex-col items-end leading-none">
            <span className="text-orange-400 font-bold text-[14px]">
              ₹{displayPrice?.toLocaleString("en-IN")}
            </span>
            {hasDiscount && (
              <span className="text-white/30 text-[9px] line-through mt-1">
                ₹{Number(price).toLocaleString("en-IN")}
              </span>
            )}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
