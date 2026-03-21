"use client";

import { useState, useEffect } from "react";
import ReviewCard from "@/components/ReviewCard";
import ReviewForm from "@/components/ReviewForm";
import { Star } from "lucide-react";

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

export default function ReviewsSection({ courseId, isEnrolled, isLoggedIn }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  function fetchReviews() {
    fetch(`/api/reviews?courseId=${courseId}`)
      .then((res) => res.json())
      .then((data) => setReviews(data.reviews ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchReviews(); }, [courseId]);

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          Reviews
          {avgRating && (
            <span className="text-white/50 text-base font-normal">
              — {avgRating} avg ({reviews.length})
            </span>
          )}
        </h2>
      </div>

      {/* Review form for enrolled students */}
      {isEnrolled && isLoggedIn && (
        <ReviewForm courseId={courseId} onSubmitted={fetchReviews} />
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="glass p-5 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-1/3 mb-3" />
              <div className="h-3 bg-white/10 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-white/40 text-sm">No reviews yet. Be the first to review!</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}
    </section>
  );
}
