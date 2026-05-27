"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock, ArrowLeft, BookOpen, Tag, X, Loader2, ShieldCheck,
  ChevronRight, Receipt, Library,
} from "lucide-react";
import RazorpayCustomForm, {
  type RazorpayOrderInfo,
} from "@/components/checkout/RazorpayCustomForm";
import type { RazorpaySuccessResponse } from "@/types/razorpay";

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

type Phase = "summary" | "payment";

// ─── Main client ─────────────────────────────────────────────────────────────

export default function BooksCheckoutClient({ items, subtotal }: Props) {
  const router = useRouter();

  // Phases
  const [phase,     setPhase]     = useState<Phase>("summary");
  const [orderInfo, setOrderInfo] = useState<RazorpayOrderInfo | null>(null);

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

  const [proceeding, setProceeding] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // ── Coupon ──────────────────────────────────────────────────────────────────

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

  // ── Proceed to payment (Phase 1 → Phase 2) ─────────────────────────────────

  async function handleProceed(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setProceeding(true);
    try {
      const res  = await fetch("/api/razorpay/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type: "books", couponCode: appliedCoupon?.code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create order");

      setOrderInfo({
        razorpayOrderId: data.razorpayOrderId,
        dbOrderId:       data.dbOrderId,
        amount:          data.amount,
        currency:        data.currency ?? "INR",
        key:             data.key,
      });
      setPhase("payment");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setProceeding(false);
    }
  }

  // ── Verify payment and redirect (Phase 2 success) ─────────────────────────

  async function handlePaymentSuccess(response: RazorpaySuccessResponse) {
    if (!orderInfo) throw new Error("Order info missing");
    const vRes  = await fetch("/api/razorpay/verify-payment", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        type:              "books",
        razorpayOrderId:   response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
        dbOrderId:         orderInfo.dbOrderId,
      }),
    });
    const vData = await vRes.json();
    if (!vRes.ok) throw new Error(vData.error ?? "Payment verification failed");
    router.push(`/checkout/success?type=books&orderId=${orderInfo.dbOrderId}`);
  }

  const description = `${items.length} book${items.length !== 1 ? "s" : ""}`;

  // ── Phase 2: Payment form ───────────────────────────────────────────────────

  if (phase === "payment" && orderInfo) {
    return (
      <div className="grid lg:grid-cols-5 gap-6 lg:gap-8 items-start">
        {/* Left: compact order recap */}
        <aside className="lg:col-span-2 space-y-3">
          <button
            type="button"
            onClick={() => setPhase("summary")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to order summary
          </button>

          <OrderRecap items={items} />

          <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-sm">
            <Row label={`Items (${items.length})`} value={`₹${baseTotal.toLocaleString("en-IN")}`} />
            {itemDiscount > 0 && (
              <Row label="Item discounts" value={`−₹${itemDiscount.toLocaleString("en-IN")}`} positive />
            )}
            {appliedCoupon && (
              <Row label={`Coupon (${appliedCoupon.code})`} value={`−₹${appliedCoupon.discount.toLocaleString("en-IN")}`} positive />
            )}
            <div className="border-t border-border pt-2 flex items-baseline justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="text-xl font-bold text-foreground">
                ₹{displayPrice.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </aside>

        {/* Right: custom payment form */}
        <div className="lg:col-span-3">
          <RazorpayCustomForm
            orderInfo={orderInfo}
            description={description}
            onSuccess={handlePaymentSuccess}
            onError={(msg) => setError(msg)}
            onBack={() => setPhase("summary")}
          />
          {error && <div className="mt-3"><InlineError msg={error} /></div>}
        </div>
      </div>
    );
  }

  // ── Phase 1: Order summary + proceed button ─────────────────────────────────

  return (
    <form onSubmit={handleProceed} className="grid lg:grid-cols-5 gap-6 lg:gap-8 items-start">
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

      {/* Proceed button */}
      <div className="lg:col-span-3">
        <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <h2 className="text-base font-bold text-foreground mb-1">Complete your purchase</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Choose from Card, UPI, or Net Banking on the next step.
          </p>

          {/* Payment method pills */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "Card",        sub: "Visa · MC · RuPay" },
              { label: "UPI",         sub: "GPay · PhonePe · Paytm" },
              { label: "Net Banking", sub: "50+ banks" },
            ].map(({ label, sub }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border bg-secondary/30 text-center"
              >
                <span className="text-xs font-semibold text-foreground">{label}</span>
                <span className="text-[10px] text-muted-foreground">{sub}</span>
              </div>
            ))}
          </div>

          {error && <div className="mb-4"><InlineError msg={error} /></div>}

          <button
            type="submit"
            disabled={proceeding}
            className="btn-primary !w-full !py-3 !text-base !font-bold justify-center"
          >
            {proceeding ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Preparing checkout…</>
            ) : (
              <><Lock className="w-4 h-4" /> Proceed to Pay ₹{displayPrice.toLocaleString("en-IN")} <ChevronRight className="w-4 h-4" /></>
            )}
          </button>

          <p className="mt-3 text-center text-[11px] text-muted-foreground/70 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3 h-3" />
            Powered by Razorpay · UPI · Cards · Net Banking · Wallets
          </p>
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
                <Link
                  href={`/books/${item.slug}`}
                  className="block text-xs font-semibold text-foreground hover:text-orange-500 transition-colors line-clamp-2 leading-snug"
                >
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
  return (
    <ul className="space-y-1.5 px-1">
      {[
        { icon: Lock,        text: "256-bit SSL encryption" },
        { icon: ShieldCheck, text: "Secured by Razorpay" },
        { icon: Library,     text: "Lifetime download access" },
      ].map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
          {text}
        </li>
      ))}
    </ul>
  );
}

function Row({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
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
