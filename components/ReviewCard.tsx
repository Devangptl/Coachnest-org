import { formatDistanceToNow } from "date-fns";
import RatingStars from "./RatingStars";
import { ThumbsUp } from "lucide-react";

interface ReviewCardProps {
  review: {
    id:       string;
    rating:   number;
    comment:  string | null;
    helpful:  number;
    createdAt: string | Date;
    user: { name: string; avatar: string | null };
  };
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const ago = formatDistanceToNow(new Date(review.createdAt), { addSuffix: true });
  const initials = review.user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="glass p-5 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        {review.user.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={review.user.avatar}
            alt={review.user.name}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-orange-500/20 border border-orange-400/25 flex items-center justify-center flex-shrink-0">
            <span className="text-orange-300 text-xs font-bold">{initials}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-white font-medium text-sm">{review.user.name}</span>
            <span className="text-white/30 text-xs">{ago}</span>
          </div>
          <RatingStars rating={review.rating} size="sm" className="mt-0.5" />
        </div>
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="text-muted-foreground text-sm leading-relaxed">{review.comment}</p>
      )}

      {/* Helpful */}
      {review.helpful > 0 && (
        <div className="flex items-center gap-1.5 text-white/30 text-xs">
          <ThumbsUp className="w-3 h-3" />
          {review.helpful} found this helpful
        </div>
      )}
    </div>
  );
}
