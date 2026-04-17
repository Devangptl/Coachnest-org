"use client";

import { useState, FormEvent, useEffect, useCallback } from "react";
import {
  Lock, ArrowLeft, Calendar, BookOpen, Tag, X,
  Loader2, ShieldCheck, CreditCard, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface Props {
  courseId:       string;
  courseName:     string;
  instructorName: string;
  lessonCount:    number;
  thumbnail:      string | null;
  price:          number;
  originalPrice:  number;
  initialCoupon?: string;
}

// Payment method badges shown to the user
const PAYMENT_METHODS = [
  { label: "Card",      sub: "Visa · Mastercard · Amex",       icon: "💳" },
  { label: "UPI",       sub: "Google Pay · PhonePe · Paytm",   icon: "📲" },
];

export default function CourseCheckoutClient({
  courseId, courseName, instructorName, lessonCount,
  thumbnail, price: initialPrice, originalPrice, initialCoupon,
}: Props) {
  // Coupon
  const [couponCode,    setCouponCode]    = useState(initialCoupon ?? "");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; label: string; discount: number } | null>(null);
  const [couponError,   setCouponError]   = useState<string | null>(null);
  const finalPrice = appliedCoupon ? Math.max(0, initialPrice - appliedCoupon.discount) : initialPrice;

  // Checkout
  const [selectedMethod, setSelectedMethod] = useState<"card" | "upi">("card");
  const [redirecting, setRedirecting] = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // Auto-apply coupon from URL
  const applyInitialCoupon = useCallback(async () => {
    if (!initialCoupon) return;
    const res = await fetch("/api/coupons/validate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: initialCoupon, courseId }),
    }).catch(() => null);
    if (!res?.ok) return;
    const data = await res.json();
    const discountAmt = data.discountType === "PERCENTAGE"
      ? Math.round(initialPrice * data.discount / 100)
      : Math.min(data.discount, initialPrice);
    setAppliedCoupon({ code: data.code, label: data.description ?? data.code, discount: discountAmt });
  }, [initialCoupon, courseId, initialPrice]);

  useEffect(() => { applyInitialCoupon(); }, [applyInitialCoupon]);

  async function handleApplyCoupon() {
    if (!couponCode.trim() || couponLoading) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res  = await fetch("/api/coupons/validate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), courseId }),
      });
      const data = await res.json();
      if (!res.ok) { setCouponError(data.error ?? "Invalid coupon"); return; }
      const discountAmt = data.discountType === "PERCENTAGE"
        ? Math.round(initialPrice * data.discount / 100)
        : Math.min(data.discount, initialPrice);
      setAppliedCoupon({ code: data.code, label: data.description ?? data.code, discount: discountAmt });
    } finally {
      setCouponLoading(false);
    }
  }

  async function handleCheckout(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setRedirecting(true);
    try {
      const res  = await fetch("/api/payments/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ courseId, couponCode: appliedCoupon?.code, paymentMethod: selectedMethod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create checkout session");
      if (!data.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setRedirecting(false);
    }
  }

  const hasDiscount = originalPrice > initialPrice || appliedCoupon;
  const savings     = originalPrice - finalPrice;

  return (
    <form onSubmit={handleCheckout}>
      <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">

        {/* ── Left: Order summary (2/5) ───────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <Link
            href={`/courses/${courseId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to course
          </Link>

          {/* Course card */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {thumbnail && (
              <div className="relative w-full aspect-video bg-secondary">
                <Image src={thumbnail} alt={courseName} fill className="object-cover" />
              </div>
            )}
            <div className="p-5">
              <p className="text-xs text-muted-foreground mb-1">by {instructorName}</p>
              <h3 className="font-bold text-foreground text-base leading-snug mb-3">{courseName}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <BookOpen className="w-3.5 h-3.5" />
                {lessonCount} lessons · Lifetime access
              </div>
            </div>
          </div>

          {/* Coupon input */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Coupon code
            </p>
            {appliedCoupon ? (
              <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                    {appliedCoupon.code}
                  </span>
                  <span className="text-emerald-600/70 dark:text-emerald-400/70 text-xs">
                    −₹{appliedCoupon.discount.toLocaleString("en-IN")} off
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}
                  className="p-1 rounded-md hover:bg-emerald-500/20 text-emerald-500/70 hover:text-emerald-500 transition-colors"
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
                  className="flex-1 bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="px-3.5 py-2 bg-secondary border border-border rounded-lg text-sm font-medium text-foreground hover:bg-secondary/70 transition-all disabled:opacity-40"
                >
                  {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                </button>
              </div>
            )}
            {couponError && <p className="text-xs text-red-500">{couponError}</p>}
          </div>

          {/* Price summary */}
          <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2.5 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Course price</span>
              <span className={hasDiscount ? "line-through" : ""}>
                ₹{originalPrice.toLocaleString("en-IN")}
              </span>
            </div>
            {initialPrice < originalPrice && (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span>Sale discount</span>
                <span>−₹{(originalPrice - initialPrice).toLocaleString("en-IN")}</span>
              </div>
            )}
            {appliedCoupon && (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span>Coupon ({appliedCoupon.code})</span>
                <span>−₹{appliedCoupon.discount.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="border-t border-border pt-2.5 flex items-center justify-between font-bold text-foreground">
              <span>Total today</span>
              <span>₹{finalPrice.toLocaleString("en-IN")}</span>
            </div>
            {savings > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium text-center pt-0.5">
                You save ₹{savings.toLocaleString("en-IN")} on this purchase!
              </p>
            )}
          </div>

          {/* Trust signals */}
          <div className="flex flex-col gap-2">
            {[
              { icon: Lock,        text: "256-bit SSL encryption" },
              { icon: ShieldCheck, text: "Secured & PCI-compliant via Stripe" },
              { icon: Calendar,    text: "30-day money-back guarantee" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <Icon className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Payment options (3/5) ──────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <h2 className="text-lg font-bold text-foreground mb-1">Choose payment method</h2>
            <p className="text-sm text-muted-foreground mb-6">
              You will be securely redirected to Stripe to complete payment.
            </p>

            {/* Payment method tiles */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {PAYMENT_METHODS.map((pm) => {
                const value = pm.label.toLowerCase() as "card" | "upi";
                const selected = selectedMethod === value;
                return (
                  <button
                    key={pm.label}
                    type="button"
                    onClick={() => setSelectedMethod(value)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all ${
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border bg-secondary/30 hover:border-border/60 hover:bg-secondary/50"
                    }`}
                  >
                    <span className="text-2xl">{pm.icon}</span>
                    <span className="text-sm font-semibold text-foreground">{pm.label}</span>
                    <span className="text-[11px] text-muted-foreground leading-tight">{pm.sub}</span>
                  </button>
                );
              })}
            </div>

            {/* UPI note */}
            <div className="mb-5 rounded-lg bg-blue-500/8 border border-blue-500/20 px-4 py-3 text-xs text-blue-600 dark:text-blue-400 flex items-start gap-2">
              <span className="mt-0.5">ℹ️</span>
              <span>
                UPI is available for Indian customers. You can pay via Google Pay, PhonePe, or
                Paytm by scanning the QR code on the next screen.
              </span>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2.5 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                <span className="flex-shrink-0 mt-0.5">⚠</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={redirecting}
              className="w-full btn-primary py-3.5 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {redirecting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to Stripe…</>
              ) : (
                <><Lock className="w-4 h-4" />
                  {finalPrice === 0
                    ? "Enroll for Free"
                    : `Pay ₹${finalPrice.toLocaleString("en-IN")}`}
                  <ChevronRight className="w-4 h-4" /></>
              )}
            </button>

            <p className="mt-4 text-center text-xs text-muted-foreground/60 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Encrypted and processed by Stripe. We never store card details.
            </p>

            {/* Accepted payment logos */}
            <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
              {["VISA", "Mastercard", "Amex", "UPI", "RuPay"].map((brand) => (
                <span
                  key={brand}
                  className="px-2 py-1 rounded border border-border text-[10px] font-bold text-muted-foreground bg-secondary/50 tracking-wide"
                >
                  {brand}
                </span>
              ))}
            </div>
          </div>

          {/* Saved cards notice removed — Stripe Checkout manages saved payment methods */}
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Previously saved cards are available on the Stripe checkout page.
          </p>
        </div>

      </div>
    </form>
  );
}
