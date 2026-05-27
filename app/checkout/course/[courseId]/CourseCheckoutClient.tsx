"use client";

import { useState, FormEvent, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Lock, ArrowLeft, Calendar, BookOpen, Tag, X,
  Loader2, ShieldCheck, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { RazorpayOptions } from "@/types/razorpay";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Load Razorpay checkout script ────────────────────────────────────────────

function useRazorpayScript() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && window.Razorpay) {
      setLoaded(true);
      return;
    }
    const script   = document.createElement("script");
    script.src     = "https://checkout.razorpay.com/v1/checkout.js";
    script.async   = true;
    script.onload  = () => setLoaded(true);
    script.onerror = () => console.error("Failed to load Razorpay checkout script");
    document.body.appendChild(script);
  }, []);
  return loaded;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CourseCheckoutClient({
  courseId, courseName, instructorName, lessonCount,
  thumbnail, price: initialPrice, originalPrice, initialCoupon,
}: Props) {
  const router         = useRouter();
  const razorpayLoaded = useRazorpayScript();

  // Coupon state
  const [couponCode,    setCouponCode]    = useState(initialCoupon ?? "");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string; label: string; discount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const displayPrice = appliedCoupon
    ? Math.max(0, initialPrice - appliedCoupon.discount)
    : initialPrice;

  const [paying, setPaying] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

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

  async function handlePay(e: FormEvent) {
    e.preventDefault();
    if (!razorpayLoaded) { setError("Payment gateway not loaded. Please refresh and try again."); return; }
    setError(null);
    setPaying(true);

    try {
      // Step 1 — create Razorpay order on backend
      const res  = await fetch("/api/razorpay/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          type:       "course",
          courseId,
          couponCode: appliedCoupon?.code,
        }),
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
          description: courseName,
          order_id:    razorpayOrderId,
          prefill:     {},
          theme:       { color: "#d4703f" },
          modal: {
            ondismiss: () => {
              setPaying(false);
              reject(new Error("Payment was cancelled."));
            },
          },
          handler: async (response) => {
            try {
              // Step 3 — verify signature on backend
              const vRes  = await fetch("/api/razorpay/verify-payment", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                  type:               "course",
                  razorpayOrderId:    response.razorpay_order_id,
                  razorpayPaymentId:  response.razorpay_payment_id,
                  razorpaySignature:  response.razorpay_signature,
                  dbOrderId,
                }),
              });
              const vData = await vRes.json();
              if (!vRes.ok) throw new Error(vData.error ?? "Payment verification failed");
              resolve();
              router.push(`/courses/${courseId}?enrolled=true`);
            } catch (err) {
              reject(err);
            }
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (response) => {
          reject(new Error(response.error?.description ?? "Payment failed. Please try again."));
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

  const hasDiscount = originalPrice > initialPrice || appliedCoupon;
  const savings     = originalPrice - displayPrice;

  return (
    <form onSubmit={handlePay}>
      <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">

        {/* Left: order summary */}
        <div className="lg:col-span-2 space-y-4">
          <Link
            href={`/courses/${courseId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to course
          </Link>

          {/* Course card */}
          <div className="rounded-md border border-border bg-card overflow-hidden">
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
          <div className="rounded-md border border-border bg-card p-4 space-y-3">
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
          <div className="rounded-md border border-border bg-secondary/30 p-4 space-y-2.5 text-sm">
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
              <span>₹{displayPrice.toLocaleString("en-IN")}</span>
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
              { icon: ShieldCheck, text: "Secured by Razorpay" },
              { icon: Calendar,    text: "30-day money-back guarantee" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <Icon className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Right: pay button */}
        <div className="lg:col-span-3">
          <div className="rounded-md border border-border bg-card p-6 sm:p-8">
            <h2 className="text-lg font-bold text-foreground mb-1">Complete your purchase</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Click below to open the secure Razorpay payment window. Supports
              UPI, cards, net banking, and wallets.
            </p>

            {error && (
              <div className="mb-4 flex items-start gap-2.5 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                <span className="flex-shrink-0 mt-0.5">⚠</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={paying || !razorpayLoaded}
              className="w-full btn-primary py-3.5 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {paying ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
              ) : (
                <><Lock className="w-4 h-4" />
                  {displayPrice === 0
                    ? "Enroll for Free"
                    : `Pay ₹${displayPrice.toLocaleString("en-IN")}`}
                  <ChevronRight className="w-4 h-4" /></>
              )}
            </button>

            <p className="mt-4 text-center text-xs text-muted-foreground/60 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Powered by Razorpay · UPI · Cards · Net Banking · Wallets
            </p>

            {/* Payment brand chips */}
            <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
              {["UPI", "VISA", "Mastercard", "RuPay", "Net Banking"].map((brand) => (
                <span
                  key={brand}
                  className="px-2 py-1 rounded border border-border text-[10px] font-bold text-muted-foreground bg-secondary/50 tracking-wide"
                >
                  {brand}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </form>
  );
}
