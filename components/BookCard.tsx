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

export default function BookCard({ book }: { book: BookVM }) {
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
      {/* ── Cover (4:5 ratio = ~25% shorter than 3:4 book aspect) ── */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-secondary/60">
        {book.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverImage}
            alt={book.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
            <BookOpen className="h-8 w-8" />
          </div>
        )}

        {/* Gradient bottom scrim — makes overlays legible regardless of cover */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        {/* Top accent line on hover */}
        <span className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-orange-600 to-amber-500 opacity-0 transition-opacity group-hover:opacity-100" />

        {/* Top-left format chip */}
        <span className="absolute left-1.5 top-1.5 z-10 rounded-sm bg-black/65 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
          {book.fileFormat}
        </span>

        {/* Top-right discount chip */}
        {hasDiscount && discountPct > 0 && (
          <span className="absolute right-1.5 top-1.5 z-10 rounded-sm bg-orange-500 px-1.5 py-px text-[9px] font-bold text-white">
            -{discountPct}%
          </span>
        )}

        {/* Bottom-left rating pill */}
        {book.avgRating > 0 && (
          <span className="absolute bottom-1.5 left-1.5 z-10 flex items-center gap-0.5 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
            {book.avgRating.toFixed(1)}
          </span>
        )}

        {/* Bottom-right price + add button */}
        <div className="absolute bottom-1.5 right-1.5 z-10 flex items-center gap-1">
          {book.isFree ? (
            <span className="rounded bg-green-500/90 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
              Free
            </span>
          ) : (
            <span className="rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white backdrop-blur-sm">
              ₹{Number(displayPrice).toLocaleString("en-IN")}
            </span>
          )}

          <button
            onClick={handleAdd}
            disabled={busy}
            aria-label={book.isFree ? "Open book" : "Add to cart"}
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm transition-colors hover:bg-orange-600 disabled:opacity-60",
              added && "bg-green-500 hover:bg-green-500",
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
        </div>
      </div>

      {/* ── Body — title + author, tight 2-line max ──────────── */}
      <div className="flex flex-1 flex-col px-2 pt-1.5 pb-2">
        <h3 className="line-clamp-2 text-[12px] font-semibold leading-snug text-foreground transition-colors group-hover:text-orange-500">
          {book.title}
        </h3>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground/70">
          {book.author}
        </p>

        {/* Inline feedback (only when needed) */}
        {(error || added) && (
          <p
            className={cn(
              "mt-1 line-clamp-1 text-[10px] leading-snug",
              error ? "text-red-400" : "text-green-500",
            )}
          >
            {error ?? "Added"}
          </p>
        )}
      </div>
    </Link>
  );
}
