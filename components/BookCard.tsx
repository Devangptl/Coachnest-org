"use client";

import Link from "next/link";
import { BookOpen, Star, Loader2 } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/hooks/useCart";
import { useRouter } from "next/navigation";

export interface BookVM {
  id:             string;
  title:          string;
  slug:           string;
  author:         string;
  coverImage:     string | null;
  fileFormat:     "PDF" | "EPUB" | "DOCX";
  price:          number | null;
  discountPrice:  number | null;
  isFree:         boolean;
  purchaseCount:  number;
  reviewCount:    number;
  avgRating:      number;
  categoryName:   string | null;
}

export default function BookCard({ book }: { book: BookVM }) {
  const router = useRouter();
  const { add } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayPrice = book.discountPrice ?? book.price;
  const hasDiscount = book.discountPrice != null && book.price != null && Number(book.discountPrice) < Number(book.price);

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (book.isFree) {
      router.push(`/books/${book.slug}`);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await add(book.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      setTimeout(() => setError(null), 3000);
    }
  }

  return (
    <Link
      href={`/books/${book.slug}`}
      className="group relative flex flex-col rounded-xl border border-white/[0.06] bg-card/50 overflow-hidden hover:border-orange-500/30 hover:bg-card transition-all"
    >
      {/* Cover */}
      <div className="relative aspect-[3/4] w-full bg-secondary/50 overflow-hidden">
        {book.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverImage}
            alt={book.title}
            className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
            <BookOpen className="h-12 w-12" />
          </div>
        )}
        <span className="absolute top-2 right-2 rounded-md bg-black/70 backdrop-blur px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          {book.fileFormat}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        {book.categoryName && (
          <span className="text-[10px] font-medium uppercase tracking-wider text-orange-500/80">
            {book.categoryName}
          </span>
        )}
        <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
          {book.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-1">by {book.author}</p>

        {/* Rating + sales */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {book.avgRating > 0 ? (
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-orange-500 text-orange-500" />
              {book.avgRating.toFixed(1)} ({book.reviewCount})
            </span>
          ) : (
            <span>New</span>
          )}
          {book.purchaseCount > 0 && (
            <>
              <span>·</span>
              <span>{book.purchaseCount} sold</span>
            </>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-baseline gap-1.5">
            {book.isFree ? (
              <span className="text-sm font-bold text-green-500">Free</span>
            ) : (
              <>
                <span className="text-sm font-bold text-foreground">₹{displayPrice}</span>
                {hasDiscount && (
                  <span className="text-[11px] text-muted-foreground line-through">₹{book.price}</span>
                )}
              </>
            )}
          </div>
          <button
            onClick={handleAdd}
            disabled={busy}
            className="rounded-md bg-orange-500/15 px-2.5 py-1 text-[11px] font-semibold text-orange-500 hover:bg-orange-500/25 transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : book.isFree ? "Read" : "Add to cart"}
          </button>
        </div>
        {error && (
          <p className="text-[10px] text-red-400 line-clamp-2">{error}</p>
        )}
      </div>
    </Link>
  );
}
