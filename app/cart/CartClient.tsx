"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2, Loader2, BookOpen, ArrowRight } from "lucide-react";
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

export default function CartClient({ initialItems, initialSubtotal }: Props) {
  const router = useRouter();
  const { remove } = useCart();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [couponCode, setCouponCode] = useState("");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = items.reduce((s, i) => s + (i.discountPrice ?? i.price), 0);

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
      <div className="rounded-xl border border-dashed border-white/[0.08] py-16 text-center">
        <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="mb-4 text-sm text-muted-foreground">No items yet — browse the catalog to add some.</p>
        <Link
          href="/books"
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Browse Books <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  const initialUsed = subtotal !== initialSubtotal ? subtotal : initialSubtotal;
  void initialUsed; // keep reference; suppress unused warning

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <ul className="space-y-3">
        {items.map((item) => {
          const finalPrice = item.discountPrice ?? item.price;
          return (
            <li
              key={item.bookId}
              className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-card/50 p-3"
            >
              <Link href={`/books/${item.slug}`} className="flex-shrink-0">
                <div className="h-20 w-16 overflow-hidden rounded-md bg-secondary/50">
                  {item.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.coverImage} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/40">
                      <BookOpen className="h-6 w-6" />
                    </div>
                  )}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/books/${item.slug}`} className="block text-sm font-semibold text-foreground hover:text-orange-500 line-clamp-2">
                  {item.title}
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground">by {item.author}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-base font-bold text-foreground">₹{finalPrice}</span>
                  {item.discountPrice != null && item.discountPrice < item.price && (
                    <span className="text-xs text-muted-foreground line-through">₹{item.price}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRemove(item.bookId)}
                aria-label="Remove from cart"
                className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>

      <aside className="h-fit rounded-xl border border-white/[0.06] bg-card/50 p-4 lg:sticky lg:top-20">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Order Summary</h2>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Subtotal ({items.length} item{items.length === 1 ? "" : "s"})</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-4 border-t border-white/[0.06] pt-3">
          <label className="mb-1 block text-xs text-muted-foreground">Coupon code</label>
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="OPTIONAL"
            className="h-9 w-full rounded-lg border border-white/[0.08] bg-secondary/40 px-3 text-sm uppercase text-foreground placeholder:text-muted-foreground/50 placeholder:normal-case focus:border-orange-500/40 focus:outline-none"
          />
        </div>

        <button
          onClick={handleCheckout}
          disabled={checkoutBusy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {checkoutBusy && <Loader2 className="h-4 w-4 animate-spin" />}
          Proceed to Checkout
        </button>

        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Secure payment via Stripe. Coupons applied at checkout.
        </p>
      </aside>
    </div>
  );
}
