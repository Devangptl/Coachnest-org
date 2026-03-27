"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import ReviewCard from "@/components/ReviewCard";
import ReviewForm from "@/components/ReviewForm";
import { Star, MessageSquareText, Filter, SortAsc } from "lucide-react";
import { cn } from "@/lib/utils";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  helpful: number;
  createdAt: string;
  user: { name: string; avatar: string | null };
}

interface Props {
  courseId: string;
  isEnrolled: boolean;
  isLoggedIn: boolean;
}

type SortOption = "recent" | "highest" | "lowest";

export default function ReviewsSection({ courseId, isEnrolled, isLoggedIn }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  function fetchReviews() {
    fetch(`/api/reviews?courseId=${courseId}`)
      .then((res) => res.json())
      .then((data) => setReviews(data.reviews ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchReviews(); }, [courseId]);

  const avgRating = useMemo(() =>
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0,
    [reviews]
  );

  // Rating distribution
  const distribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // 1-star to 5-star
    reviews.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++; });
    return counts;
  }, [reviews]);

  // Filtered + sorted reviews
  const filteredReviews = useMemo(() => {
    let result = filterRating
      ? reviews.filter((r) => r.rating === filterRating)
      : reviews;

    if (sortBy === "highest") result = [...result].sort((a, b) => b.rating - a.rating);
    else if (sortBy === "lowest") result = [...result].sort((a, b) => a.rating - b.rating);
    else result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return result;
  }, [reviews, filterRating, sortBy]);

  return (
    <section className="space-y-6">
      {/* Header + Rating overview */}
      <div className="backdrop-blur-md bg-secondary border border-border rounded-lg p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
          {/* Left: big average */}
          <div className="flex flex-col items-center justify-center sm:min-w-[140px]">
            <span className="text-5xl font-bold text-white mb-2">
              {avgRating > 0 ? avgRating.toFixed(1) : "—"}
            </span>
            <div className="flex items-center gap-0.5 mb-1.5">
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
            <span className="text-muted-foreground/70 text-xs">{reviews.length} reviews</span>
          </div>

          {/* Right: rating breakdown */}
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[star - 1];
              const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              const isFiltered = filterRating === star;

              return (
                <button
                  key={star}
                  onClick={() => setFilterRating(isFiltered ? null : star)}
                  className={cn(
                    "flex items-center gap-3 w-full text-left group py-0.5 rounded transition-colors",
                    isFiltered && "bg-white/[0.03]"
                  )}
                >
                  <span className="text-muted-foreground text-xs w-7 text-right font-medium">{star}★</span>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-amber-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: (5 - star) * 0.1 }}
                    />
                  </div>
                  <span className="text-white/30 text-xs w-8 font-medium">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter + Sort controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-white/30" />
            {[5, 4, 3, 2, 1].map((star) => (
              <button
                key={star}
                onClick={() => setFilterRating(filterRating === star ? null : star)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition-all",
                  filterRating === star
                    ? "bg-amber-500/20 border-amber-400/30 text-amber-400"
                    : "bg-white/[0.03] border-white/[0.08] text-muted-foreground/70 hover:text-muted-foreground hover:border-border"
                )}
              >
                {star}★
              </button>
            ))}
            {filterRating && (
              <button
                onClick={() => setFilterRating(null)}
                className="text-xs text-white/30 hover:text-muted-foreground transition-colors ml-1"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <SortAsc className="w-3.5 h-3.5 text-white/30" />
            {(["recent", "highest", "lowest"] as SortOption[]).map((opt) => (
              <button
                key={opt}
                onClick={() => setSortBy(opt)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition-all capitalize",
                  sortBy === opt
                    ? "bg-orange-500/15 border-orange-400/25 text-orange-400"
                    : "bg-white/[0.03] border-white/[0.08] text-muted-foreground/70 hover:text-muted-foreground"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Review form for enrolled students */}
      {isEnrolled && isLoggedIn && (
        <ReviewForm courseId={courseId} onSubmitted={fetchReviews} />
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="backdrop-blur-md bg-secondary border border-border rounded-lg p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="skeleton w-10 h-10 rounded-full" />
                <div className="space-y-1.5">
                  <div className="skeleton h-4 w-24 rounded" />
                  <div className="skeleton h-3 w-16 rounded" />
                </div>
              </div>
              <div className="skeleton h-3 w-full rounded mb-2" />
              <div className="skeleton h-3 w-2/3 rounded" />
            </div>
          ))}
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="backdrop-blur-md bg-secondary border border-border rounded-lg py-16 text-center">
          <MessageSquareText className="w-14 h-14 text-white/10 mx-auto mb-4" />
          <p className="text-muted-foreground/70 text-base mb-1">
            {filterRating ? `No ${filterRating}-star reviews yet` : "No reviews yet"}
          </p>
          <p className="text-white/25 text-sm">
            {filterRating ? "Try a different filter" : "Be the first to review!"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}
    </section>
  );
}
