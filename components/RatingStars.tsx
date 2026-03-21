"use client";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  rating: number;      // 0–5, can be fractional
  max?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRate?: (rating: number) => void;
  className?: string;
}

const sizeMap = { sm: "w-3 h-3", md: "w-4 h-4", lg: "w-5 h-5" };

export default function RatingStars({
  rating,
  max = 5,
  size = "md",
  interactive = false,
  onRate,
  className,
}: Props) {
  const stars = Array.from({ length: max }, (_, i) => {
    const filled    = i + 1 <= Math.floor(rating);
    const halfFill  = !filled && i < rating;
    return { filled, halfFill, index: i + 1 };
  });

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {stars.map(({ filled, halfFill, index }) => (
        <button
          key={index}
          type={interactive ? "button" : undefined}
          onClick={interactive && onRate ? () => onRate(index) : undefined}
          className={cn(
            "relative",
            interactive && "cursor-pointer hover:scale-110 transition-transform"
          )}
          aria-label={interactive ? `Rate ${index} star${index > 1 ? "s" : ""}` : undefined}
        >
          <Star
            className={cn(
              sizeMap[size],
              filled   ? "fill-amber-400 text-amber-400"
                       : halfFill ? "fill-amber-400/50 text-amber-400"
                       : "fill-transparent text-white/20"
            )}
          />
        </button>
      ))}
    </div>
  );
}
