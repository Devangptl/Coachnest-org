import { formatDistanceToNow } from "date-fns";
import RatingStars from "./RatingStars";
import Avatar from "./Avatar";
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

  return (
    <div className="glass p-5 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar
          name={review.user.name}
          avatar={review.user.avatar}
          size="w-10 h-10"
          className="flex-shrink-0"
        />
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
