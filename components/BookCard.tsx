"use client";

import Link from "next/link";
import { BookOpen, Star, Loader2, Plus, Check } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/useCart";
import { cn } from "@/lib/utils";

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

export default function BookCard({
  book,
  compact = false,
}: { book: BookVM; compact?: boolean }) {
  const router = useRouter();
  const { add } = useCart();
  const [busy, setBusy]   = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasDiscount =
    book.discountPrice != null &&
    book.price != null &&
    Number(book.discountPrice) < Number(book.price);
  const displayPrice = book.discountPrice ?? book.price;
  const discountPct = hasDiscount
    ? Math.round((1 - Number(book.discountPrice) / Number(book.price)) * 100)
    : 0;

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
      setTimeout(() => setError(null), 2200);
    } else {
      setAdded(true);
      setTimeout(() => setAdded(false), 1600);
    }
  }

  return (
    <Link
      href={`/books/${book.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-md border border-border/60 bg-card transition-colors duration-200 hover:border-orange-500/30"
    >
      {/* Top accent line on hover */}
      <span className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-orange-600 to-amber-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      {/* ── Cover ─────────────────────────────────────────────── */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-secondary/60">
        {book.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverImage}
            alt={book.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-muted-foreground/30">
            <BookOpen className="h-8 w-8" />
          </div>
        )}

        {/* Format chip — top-left */}
        <span className="absolute left-1.5 top-1.5 rounded-sm bg-black/60 backdrop-blur-sm px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-white">
          {book.fileFormat}
        </span>

        {/* Discount chip — top-right */}
        {hasDiscount && discountPct > 0 && (
          <span className="absolute right-1.5 top-1.5 rounded-sm bg-orange-500 px-1.5 py-px text-[9px] font-bold text-white">
            -{discountPct}%
          </span>
        )}

        {/* Free pill — bottom-right */}
        {book.isFree && (
          <span className="absolute bottom-1.5 right-1.5 rounded-sm bg-green-500/90 px-1.5 py-px text-[9px] font-bold uppercase text-white">
            Free
          </span>
        )}

        {/* Quick-add button (top-right on hover) */}
        {!book.isFree && (
          <button
            onClick={handleAdd}
            disabled={busy}
            aria-label="Add to cart"
            className={cn(
              "absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm transition-all duration-200 hover:bg-orange-600 disabled:opacity-60",
              compact ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
          >
            {busy ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : added ? (
              <Check className="h-3 w-3" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
          </button>
        )}
      </div>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-0.5 p-2">
        <h3 className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-foreground transition-colors group-hover:text-orange-500">
          {book.title}
        </h3>
        <p className="truncate text-[10.5px] text-muted-foreground/80">
          by {book.author}
        </p>

        {/* Footer row */}
        <div className="mt-auto flex items-center justify-between gap-1 pt-1.5">
          {/* Price */}
          <div className="flex items-baseline gap-1">
            {book.isFree ? (
              <span className="text-[11px] font-bold text-green-500">Free</span>
            ) : (
              <>
                <span className="text-[13px] font-bold text-foreground">
                  ₹{Number(displayPrice).toLocaleString("en-IN")}
                </span>
                {hasDiscount && (
                  <span className="text-[9px] text-muted-foreground/70 line-through">
                    ₹{Number(book.price).toLocaleString("en-IN")}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Rating or downloads */}
          {book.avgRating > 0 ? (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-500">
              <Star className="h-2.5 w-2.5 fill-current" />
              {book.avgRating.toFixed(1)}
            </span>
          ) : book.purchaseCount > 0 ? (
            <span className="text-[10px] text-muted-foreground/70">
              {book.purchaseCount.toLocaleString()} sold
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/60">New</span>
          )}
        </div>

        {/* Inline feedback */}
        {(error || added) && !compact && (
          <p
            className={cn(
              "mt-1 line-clamp-1 text-[10px] leading-snug",
              error ? "text-red-400" : "text-green-500",
            )}
          >
            {error ?? "Added to cart"}
          </p>
        )}
      </div>

    </Link>
  );
}
