"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock, ArrowLeft, BookOpen, Tag, X, Loader2, ShieldCheck,
  ChevronRight, Receipt, Library,
} from "lucide-react";
import type { RazorpayOptions } from "@/types/razorpay";

// ── Load Razorpay checkout script ────────────────────────────────────────────

function useRazorpayScript() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && window.Razorpay) { setLoaded(true); return; }
    const script   = document.createElement("script");
    script.src     = "https://checkout.razorpay.com/v1/checkout.js";
    script.async   = true;
    script.onload  = () => setLoaded(true);
    script.onerror = () => console.error("Failed to load Razorpay script");
    document.body.appendChild(script);
  }, []);
  return loaded;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CheckoutItem {
  bookId:        string;
  title:         string;
  slug:          string;
  coverImage:    string | null;
  author:        string;
  price:         number;
  discountPrice: number | null;
}

interface Props {
  items:    CheckoutItem[];
  subtotal: number;
}

// ─── Main client ─────────────────────────────────────────────────────────────

export default function BooksCheckoutClient({ items, subtotal }: Props) {
  const router         = useRouter();
  const razorpayLoaded = useRazorpayScript();

  // Coupon
  const [couponCode,    setCouponCode]    = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string; label: string; discount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const baseTotal    = items.reduce((s, i) => s + i.price, 0);
  const itemDiscount = baseTotal - subtotal;
  const displayPrice = appliedCoupon ? Math.max(0, subtotal - appliedCoupon.discount) : subtotal;
  const totalSavings = baseTotal - displayPrice;

  const [paying, setPaying] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  async function handleApplyCoupon() {
    if (!couponCode.trim() || couponLoading) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res  = await fetch("/api/coupons/validate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setCouponError(data.error ?? "Invalid coupon"); return; }
      const discountAmt = data.discountType === "PERCENTAGE"
        ? Math.round(subtotal * data.discount / 100)
        : Math.min(data.discount, subtotal);
      setAppliedCoupon({ code: data.code, label: data.description ?? data.code, discount: discountAmt });
    } catch {
      setCouponError("Could not validate coupon. Please try again.");
    } finally {
      setCouponLoading(false);
    }
  }

  async function handlePay(e: FormEvent) {
    e.preventDefault();
    if (!razorpayLoaded) { setError("Payment gateway not loaded. Please refresh."); return; }
    setError(null);
    setPaying(true);

    try {
      // Step 1 — create Razorpay order
      const res  = await fetch("/api/razorpay/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type: "books", couponCode: appliedCoupon?.code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create order");

      const { razorpayOrderId, dbOrderId, amount, currency, key } = data;

      // Step 2 — open Razorpay modal
      await new Promise<void>((resolve, reject) => {
        const options: RazorpayOptions = {
          key,
          amount:      Math.round(amount * 100), // paise
          currency:    currency ?? "INR",
          name:        "Coachnest",
          description: `${items.length} book${items.length > 1 ? "s" : ""}`,
          order_id:    razorpayOrderId,
          theme:       { color: "#d4703f" },
          modal: {
            ondismiss: () => {
              setPaying(false);
              reject(new Error("Payment was cancelled."));
            },
          },
          handler: async (response) => {
            try {
              // Step 3 — verify signature
              const vRes  = await fetch("/api/razorpay/verify-payment", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                  type:               "books",
                  razorpayOrderId:    response.razorpay_order_id,
                  razorpayPaymentId:  response.razorpay_payment_id,
                  razorpaySignature:  response.razorpay_signature,
                  dbOrderId,
                }),
              });
              const vData = await vRes.json();
              if (!vRes.ok) throw new Error(vData.error ?? "Payment verification failed");
              resolve();
              router.push(`/checkout/success?type=books&orderId=${dbOrderId}`);
            } catch (err) {
              reject(err);
            }
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (r) => {
          reject(new Error(r.error?.description ?? "Payment failed. Please try again."));
        });
        rzp.open();
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (msg !== "Payment was cancelled.") setError(msg);
    } finally {
      setPaying(false);
    }
  }

  return (
    <form onSubmit={handlePay} className="grid lg:grid-cols-5 gap-6 lg:gap-8 items-start">
      {/* Order summary */}
      <aside className="lg:col-span-2 space-y-3">
        <OrderRecap items={items} />

        {/* Coupon */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="label flex items-center gap-1.5">
            <Tag className="w-3 h-3" /> Coupon code
          </p>
          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/25 rounded-md px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <Tag className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm truncate">
                  {appliedCoupon.code}
                </span>
                <span className="text-emerald-600/80 dark:text-emerald-400/80 text-xs whitespace-nowrap">
                  −₹{appliedCoupon.discount.toLocaleString("en-IN")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}
                className="p-1 rounded-md hover:bg-emerald-500/20 text-emerald-500/70 hover:text-emerald-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleApplyCoupon())}
                placeholder="Enter code"
                className="input-glass uppercase placeholder:normal-case"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponCode.trim()}
                className="btn-secondary !text-xs"
              >
                {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
              </button>
            </div>
          )}
          {couponError && <p className="mt-2 text-xs text-red-500">{couponError}</p>}
        </div>

        {/* Totals */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-sm">
          <h3 className="label flex items-center gap-1.5 !mb-2">
            <Receipt className="w-3 h-3" /> Order Summary
          </h3>
          <Row label={`Items (${items.length})`} value={`₹${baseTotal.toLocaleString("en-IN")}`} />
          {itemDiscount > 0 && (
            <Row label="Item discounts" value={`−₹${itemDiscount.toLocaleString("en-IN")}`} positive />
          )}
          {appliedCoupon && (
            <Row label={`Coupon (${appliedCoupon.code})`} value={`−₹${appliedCoupon.discount.toLocaleString("en-IN")}`} positive />
          )}
          <div className="border-t border-border pt-2 flex items-baseline justify-between">
            <span className="text-muted-foreground">Total today</span>
            <span className="text-xl font-bold text-foreground">
              ₹{displayPrice.toLocaleString("en-IN")}
            </span>
          </div>
          {totalSavings > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium text-center pt-1">
              You save ₹{totalSavings.toLocaleString("en-IN")}!
            </p>
          )}
        </div>

        <TrustSignals />
      </aside>

      {/* Pay button */}
      <div className="lg:col-span-3">
        <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <h2 className="text-base font-bold text-foreground mb-1">Complete your purchase</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Click below to open the secure Razorpay payment window. Supports
            UPI, cards, net banking, and wallets.
          </p>

          {error && <div className="mb-4"><InlineError msg={error} /></div>}

          <button
            type="submit"
            disabled={paying || !razorpayLoaded}
            className="btn-primary !w-full !py-3 !text-base !font-bold justify-center"
          >
            {paying ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
            ) : (
              <><Lock className="w-4 h-4" /> Pay ₹{displayPrice.toLocaleString("en-IN")} <ChevronRight className="w-4 h-4" /></>
            )}
          </button>

          <p className="mt-3 text-center text-[11px] text-muted-foreground/70 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3 h-3" />
            Powered by Razorpay · UPI · Cards · Net Banking · Wallets
          </p>

          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            {["UPI", "VISA", "Mastercard", "RuPay", "Net Banking"].map((brand) => (
              <span key={brand} className="px-2 py-0.5 rounded border border-border text-[10px] font-bold text-muted-foreground bg-secondary/40 tracking-wide">
                {brand}
              </span>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}

// ─── Small inline components ─────────────────────────────────────────────────

function OrderRecap({ items }: { items: CheckoutItem[] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="label flex items-center gap-1.5 !mb-3">
        <Library className="w-3 h-3" /> Your books ({items.length})
      </h3>
      <ul className="space-y-2.5">
        {items.map((item) => {
          const finalPrice = item.discountPrice ?? item.price;
          return (
            <li key={item.bookId} className="flex items-start gap-2.5">
              <Link href={`/books/${item.slug}`} className="flex-shrink-0">
                <div className="h-14 w-10 overflow-hidden rounded border border-border bg-secondary/60">
                  {item.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.coverImage} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/30">
                      <BookOpen className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/books/${item.slug}`} className="block text-xs font-semibold text-foreground hover:text-orange-500 transition-colors line-clamp-2 leading-snug">
                  {item.title}
                </Link>
                <p className="mt-0.5 text-[11px] text-muted-foreground truncate">by {item.author}</p>
              </div>
              <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                ₹{finalPrice.toLocaleString("en-IN")}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TrustSignals() {
  const items = [
    { icon: Lock,        text: "256-bit SSL encryption" },
    { icon: ShieldCheck, text: "Secured by Razorpay" },
    { icon: Library,     text: "Lifetime download access" },
  ];
  return (
    <ul className="space-y-1.5 px-1">
      {items.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
          {text}
        </li>
      ))}
    </ul>
  );
}

function Row({
  label, value, positive,
}: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={positive ? "text-emerald-500 font-medium" : "text-foreground font-medium"}>
        {value}
      </span>
    </div>
  );
}

function InlineError({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md px-3.5 py-2.5">
      <span className="flex-shrink-0 mt-0.5">⚠</span>
      {msg}
    </div>
  );
}
