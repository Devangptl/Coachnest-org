"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Trash2, Loader2, BookOpen, ArrowRight, Tag, ShieldCheck, Receipt,
} from "lucide-react";
import { useCart } from "@/hooks/useCart";

interface Item {
  bookId:        string;
  title:         string;
  slug:          string;
  coverImage:    string | null;
  author:        string;
  price:         number;
  discountPrice: number | null;
}

interface Props {
  initialItems:    Item[];
  initialSubtotal: number;
}

export default function CartClient({ initialItems }: Props) {
  const router = useRouter();
  const { remove } = useCart();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [couponCode, setCouponCode] = useState("");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = items.reduce((s, i) => s + (i.discountPrice ?? i.price), 0);
  const baseTotal = items.reduce((s, i) => s + i.price, 0);
  const itemDiscount = baseTotal - subtotal;

  async function handleRemove(bookId: string) {
    await remove(bookId);
    setItems((prev) => prev.filter((i) => i.bookId !== bookId));
  }

  async function handleCheckout() {
    setCheckoutBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/create-book-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponCode: couponCode.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      router.push(`/checkout/success?type=books&orderId=${data.orderId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setCheckoutBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/30 py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10 border border-orange-500/20">
          <BookOpen className="h-7 w-7 text-orange-500/70" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">Your cart is empty</h3>
        <p className="mb-5 text-sm text-muted-foreground">
          Browse the catalog and add some titles to get started.
        </p>
        <Link href="/books" className="btn-primary !py-2 !px-4 !text-sm">
          Browse Books <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* ── Items ─────────────────────────────────────────────── */}
      <ul className="space-y-2.5">
        {items.map((item) => {
          const finalPrice = item.discountPrice ?? item.price;
          const hasDiscount = item.discountPrice != null && item.discountPrice < item.price;
          return (
            <li
              key={item.bookId}
              className="group flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-orange-500/30"
            >
              {/* Cover */}
              <Link href={`/books/${item.slug}`} className="flex-shrink-0">
                <div className="h-24 w-[68px] overflow-hidden rounded-md border border-border bg-secondary/60">
                  {item.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.coverImage} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/30">
                      <BookOpen className="h-6 w-6" />
                    </div>
                  )}
                </div>
              </Link>

              {/* Title + author */}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/books/${item.slug}`}
                  className="block text-[15px] font-semibold text-foreground hover:text-orange-500 transition-colors line-clamp-2"
                >
                  {item.title}
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground">by {item.author}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-foreground">
                    ₹{finalPrice.toLocaleString("en-IN")}
                  </span>
                  {hasDiscount && (
                    <>
                      <span className="text-xs text-muted-foreground line-through">
                        ₹{item.price.toLocaleString("en-IN")}
                      </span>
                      <span className="rounded bg-orange-500/15 border border-orange-500/25 px-1.5 py-px text-[10px] font-bold text-orange-600 dark:text-orange-300">
                        -{Math.round((1 - item.discountPrice! / item.price) * 100)}%
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Remove */}
              <button
                onClick={() => handleRemove(item.bookId)}
                aria-label="Remove from cart"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>

      {/* ── Sticky summary ──────────────────────────────────────── */}
      <aside className="h-fit lg:sticky lg:top-20">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Receipt className="h-3.5 w-3.5" /> Order Summary
          </h2>

          <div className="space-y-2 text-sm">
            <Row label={`Items (${items.length})`} value={`₹${baseTotal.toLocaleString("en-IN")}`} />
            {itemDiscount > 0 && (
              <Row label="Item discounts" value={`−₹${itemDiscount.toLocaleString("en-IN")}`} positive />
            )}
            <hr className="border-border my-3" />
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-xl font-bold text-foreground">
                ₹{subtotal.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Coupon */}
          <div className="mt-4 border-t border-border pt-4">
            <label className="label flex items-center gap-1.5">
              <Tag className="h-3 w-3" /> Coupon code
            </label>
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Optional"
              className="input-glass uppercase placeholder:normal-case"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Coupon discount is applied at checkout.
            </p>
          </div>

          <button
            onClick={handleCheckout}
            disabled={checkoutBusy}
            className="btn-primary mt-4 !w-full !py-2.5 !text-sm justify-center"
          >
            {checkoutBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Redirecting…
              </>
            ) : (
              <>
                Proceed to Checkout <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          {error && (
            <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-400">
              {error}
            </div>
          )}

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-green-500/80" />
            Secure payment · Lifetime download
          </p>
        </div>
      </aside>
    </div>
  );
}

function Row({
  label, value, positive = false,
}: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={positive ? "text-green-500 font-medium" : "text-foreground font-medium"}>
        {value}
      </span>
    </div>
  );
}
