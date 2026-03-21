"use client";
import { useState } from "react";
import { Button } from "./ui/Button";
import RatingStars from "./RatingStars";
import toast from "react-hot-toast";

interface Props {
  courseId:    string;
  onSubmitted?: () => void;
}

export default function ReviewForm({ courseId, onSubmitted }: Props) {
  const [rating,  setRating]  = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { toast.error("Please select a rating"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ courseId, rating, comment }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to submit review");
      }
      toast.success("Review submitted!");
      setRating(0);
      setComment("");
      onSubmitted?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass p-5 space-y-4">
      <h3 className="text-white font-semibold">Leave a Review</h3>

      <div>
        <label className="label">Your Rating</label>
        <RatingStars
          rating={rating}
          interactive
          onRate={setRating}
          size="lg"
        />
      </div>

      <div>
        <label className="label" htmlFor="review-comment">Comment (optional)</label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience..."
          rows={4}
          className="input-glass resize-none"
        />
      </div>

      <Button type="submit" loading={loading} disabled={rating === 0}>
        Submit Review
      </Button>
    </form>
  );
}
