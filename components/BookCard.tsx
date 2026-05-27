"use client";

import Link from "next/link";
import { ShoppingCart, BookOpen, Star, Loader2, FileText, Download } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/useCart";
import { Badge } from "./ui/Badge";
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

const FORMAT_LABEL: Record<BookVM["fileFormat"], string> = {
  PDF:  "PDF",
  EPUB: "EPUB",
  DOCX: "DOCX",
};

export default function BookCard({
  book,
  compact = false,
}: { book: BookVM; compact?: boolean }) {
  const router = useRouter();
  const { add } = useCart();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "err" | "ok"; msg: string } | null>(null);

  const hasDiscount =
    book.discountPrice != null &&
    book.price != null &&
    Number(book.discountPrice) < Number(book.price);
  const displayPrice = book.discountPrice ?? book.price;
  const discountPct = hasDiscount
    ? Math.round((1 - Number(book.discountPrice) / Number(book.price)) * 100)
    : 0;

  async function handleAction(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (book.isFree) {
      router.push(`/books/${book.slug}`);
      return;
    }
    setBusy(true);
    setFeedback(null);
    const result = await add(book.id);
    setBusy(false);
    if (!result.ok) {
      setFeedback({ kind: "err", msg: result.error });
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback({ kind: "ok", msg: "Added to cart" });
      setTimeout(() => setFeedback(null), 1800);
    }
  }

  return (
    <div className="relative group block h-full">
      <Link href={`/books/${book.slug}`} className="block h-full">
        <div className="relative bg-card border border-border/60 rounded-md overflow-hidden transition-colors duration-300 group-hover:border-orange-500/30 h-full flex flex-col">

          {/* Top orange accent line on hover */}
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-orange-600 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />

          {/* ── Cover image ─────────────────────────────────── */}
          <div className="relative w-full aspect-[3/4] bg-secondary/60 overflow-hidden">
            {book.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={book.coverImage}
                alt={book.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground/30">
                <BookOpen className={cn(compact ? "w-7 h-7" : "w-10 h-10")} />
                <span className="text-[10px] uppercase tracking-wider font-semibold">No cover</span>
              </div>
            )}

            {/* Format badge — top-left */}
            <div className={cn("absolute top-2 left-2 flex items-center gap-1 bg-black/65 backdrop-blur-sm border border-white/10 rounded text-white font-bold uppercase tracking-wider", compact ? "px-1.5 py-0.5 text-[8px]" : "px-2 py-0.5 text-[10px]")}>
              <FileText className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
              {FORMAT_LABEL[book.fileFormat]}
            </div>

            {/* Discount badge — top-right */}
            {hasDiscount && discountPct > 0 && (
              <div className={cn("absolute top-1.5 right-1.5 bg-orange-500 text-white font-bold rounded", compact ? "text-[8px] px-1 py-px" : "text-[10px] px-2 py-0.5 rounded-md")}>
                -{discountPct}%
              </div>
            )}

            {/* Bottom-left — purchase count */}
            {!compact && book.purchaseCount > 0 && (
              <div className="absolute bottom-3 left-3">
                <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm border border-white/10 rounded-md px-2 py-1">
                  <Download className="w-3 h-3 text-orange-300" />
                  <span className="text-white text-[11px] font-medium">
                    {book.purchaseCount.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Bottom-right — price */}
            {!book.isFree && displayPrice != null && (
              <div className={cn("absolute right-1.5 bg-black/75 border border-white/10 rounded", compact ? "bottom-1.5 px-1.5 py-px" : "bottom-3 px-2.5 py-1 rounded-md")}>
                {hasDiscount ? (
                  <div className="flex items-center gap-1">
                    <span className={cn("text-white font-bold leading-none", compact ? "text-[10px]" : "text-sm")}>
                      ₹{Number(displayPrice).toLocaleString("en-IN")}
                    </span>
                    <span className="text-white/60 text-[8px] line-through leading-none">
                      ₹{Number(book.price).toLocaleString("en-IN")}
                    </span>
                  </div>
                ) : (
                  <span className={cn("text-white font-bold leading-none", compact ? "text-[10px]" : "text-sm")}>
                    ₹{Number(displayPrice).toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            )}
            {book.isFree && (
              <div className={cn("absolute right-1.5 bg-green-500/90 border border-green-300/40 rounded text-white font-bold", compact ? "bottom-1.5 px-1.5 py-px text-[10px]" : "bottom-3 px-2.5 py-1 rounded-md text-sm")}>
                FREE
              </div>
            )}
          </div>

          {/* ── Content ───────────────────────────────────── */}
          <div className={cn(compact ? "p-2" : "p-4", "flex-1 flex flex-col")}>
            {/* Category */}
            {book.categoryName && !compact && (
              <Badge variant="purple" className="self-start mb-2 text-[10px]">
                {book.categoryName}
              </Badge>
            )}

            {/* Title */}
            <h3 className={cn("text-foreground font-semibold line-clamp-2 group-hover:text-orange-500 transition-colors leading-snug", compact ? "text-[11px] mb-0.5" : "text-[15px] mb-1")}>
              {book.title}
            </h3>

            {/* Author */}
            <p className={cn("text-muted-foreground/70 truncate", compact ? "text-[10px] mb-1" : "text-xs mb-2")}>
              by {book.author}
            </p>

            {/* Footer stats */}
            <div className={cn("flex items-center justify-between gap-1 mt-auto", compact ? "" : "pt-3 border-t border-border/50")}>
              <div className={cn("flex items-center gap-1.5 text-muted-foreground/70", compact ? "text-[10px]" : "text-xs")}>
                {book.avgRating > 0 ? (
                  <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                    <Star className={cn("fill-current", compact ? "w-2.5 h-2.5" : "w-3 h-3")} />
                    {book.avgRating.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-muted-foreground/50">New</span>
                )}
                {book.reviewCount > 0 && (
                  <span className="text-muted-foreground/50">({book.reviewCount})</span>
                )}
              </div>

              {/* Add-to-cart button — non-compact only */}
              {!compact && (
                <button
                  onClick={handleAction}
                  disabled={busy}
                  aria-label={book.isFree ? "Open book" : "Add to cart"}
                  className="flex items-center gap-1 rounded-md bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/40 px-2 py-1 text-[11px] font-semibold text-orange-600 dark:text-orange-300 transition-colors disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : book.isFree ? (
                    <BookOpen className="w-3 h-3" />
                  ) : (
                    <ShoppingCart className="w-3 h-3" />
                  )}
                  {book.isFree ? "Read" : "Add"}
                </button>
              )}
            </div>

            {/* Feedback toast (inline) */}
            {feedback && !compact && (
              <p className={cn("mt-2 text-[10px] leading-snug line-clamp-2", feedback.kind === "err" ? "text-red-400" : "text-green-500")}>
                {feedback.msg}
              </p>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
