"use client";

import { useState, FormEvent, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Lock, ArrowLeft, BookOpen, Tag, X,
  Loader2, ShieldCheck, ChevronRight, Calendar,
  CheckCircle2, CreditCard, Smartphone,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import RazorpayCustomForm, {
  type RazorpayOrderInfo,
} from "@/components/checkout/RazorpayCustomForm";
import type { RazorpaySuccessResponse } from "@/types/razorpay";
import GlassCard from "@/components/GlassCard";
import { cn } from "@/lib/utils";

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
  userEmail?:     string;
}

type Phase = "summary" | "payment";

// ── Main component ─────────────────────────────────────────────────────────────

export default function CourseCheckoutClient({
  courseId, courseName, instructorName, lessonCount,
  thumbnail, price: initialPrice, originalPrice, initialCoupon, userEmail,
}: Props) {
  const router = useRouter();

  // Phases
  const [phase,     setPhase]     = useState<Phase>("summary");
  const [orderInfo, setOrderInfo] = useState<RazorpayOrderInfo | null>(null);

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

  const [proceeding, setProceeding] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

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

  // ── Coupon apply ────────────────────────────────────────────────────────────

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

  // ── Proceed to payment (Phase 1 → Phase 2) ─────────────────────────────────

  async function handleProceed(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setProceeding(true);
    try {
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

      setOrderInfo({
        razorpayOrderId: data.razorpayOrderId,
        dbOrderId:       data.dbOrderId,
        amount:          data.amount,
        currency:        data.currency ?? "INR",
        key:             data.key,
        type:            "course",
      });
      setPhase("payment");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setProceeding(false);
    }
  }

  // ── Verify payment and redirect (Phase 2 success — card) ─────────────────

  async function handlePaymentSuccess(response: RazorpaySuccessResponse) {
    if (!orderInfo) throw new Error("Order info missing");
    const vRes  = await fetch("/api/razorpay/verify-payment", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        type:              "course",
        razorpayOrderId:   response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
        dbOrderId:         orderInfo.dbOrderId,
      }),
    });
    const vData = await vRes.json();
    if (!vRes.ok) throw new Error(vData.error ?? "Payment verification failed");
    router.push(`/courses/${courseId}?enrolled=true`);
  }

  // UPI S2S — order already finalised server-side; just redirect
  function handleUpiCaptured() {
    router.push(`/courses/${courseId}?enrolled=true`);
  }

  const hasDiscount = originalPrice > initialPrice || appliedCoupon;
  const savings     = originalPrice - displayPrice;

  // ── Phase 2: Payment form ───────────────────────────────────────────────────

  if (phase === "payment" && orderInfo) {
    return (
      <div className="grid lg:grid-cols-5 gap-6 lg:gap-10 items-start">

        {/* Left: compact order summary */}
        <div className="lg:col-span-2 space-y-4">
          <button
            type="button"
            onClick={() => setPhase("summary")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to order summary
          </button>

          <GlassCard padding="sm" className="overflow-hidden !p-0">
            <div className="flex items-start gap-3 p-4">
              {thumbnail && (
                <div className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-secondary">
                  <Image src={thumbnail} alt={courseName} fill className="object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0 py-0.5">
                <p className="text-[11px] text-muted-foreground mb-0.5">by {instructorName}</p>
                <h3 className="font-bold text-foreground text-sm leading-snug mb-2 line-clamp-2">
                  {courseName}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{lessonCount} lessons · Lifetime access</span>
                </div>
              </div>
            </div>

            <div className="border-t border-border bg-secondary/20 px-4 py-3 space-y-1.5 text-sm">
              {appliedCoupon && (
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                  <span className="text-xs">Coupon ({appliedCoupon.code})</span>
                  <span className="text-xs font-medium">
                    −₹{appliedCoupon.discount.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Total today</span>
                <span className="font-bold text-lg text-foreground">
                  ₹{displayPrice.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right: custom payment form */}
        <div className="lg:col-span-3">
          <RazorpayCustomForm
            orderInfo={orderInfo}
            description={courseName}
            prefillEmail={userEmail}
            onSuccess={handlePaymentSuccess}
            onUpiCaptured={handleUpiCaptured}
            onError={(msg) => setError(msg)}
            onBack={() => setPhase("summary")}
          />
          {error && (
            <div className="mt-3 flex items-start gap-2.5 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

      </div>
    );
  }

  // ── Phase 1: Order summary + proceed button ─────────────────────────────────

  return (
    <form onSubmit={handleProceed}>
      <div className="grid lg:grid-cols-5 gap-6 lg:gap-10 items-start">

        {/* ── Left column: course card + coupon + price ── */}
        <div className="lg:col-span-2 space-y-4">
          <Link
            href={`/courses/${courseId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to course
          </Link>

          {/* Course card */}
          <GlassCard padding="sm" className="overflow-hidden !p-0">
            {/* Thumbnail */}
            <div className="relative w-full aspect-video bg-secondary overflow-hidden">
              {thumbnail ? (
                <Image src={thumbnail} alt={courseName} fill className="object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#d97757]/20 to-secondary flex items-center justify-center">
                  <BookOpen className="w-12 h-12 text-[#d97757]/40" />
                </div>
              )}
              {/* bottom gradient overlay */}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
            </div>

            {/* Course info */}
            <div className="p-5">
              {/* Instructor badge */}
              <div className="inline-flex items-center gap-1.5 bg-secondary/60 border border-border rounded-full px-2.5 py-1 mb-3">
                <div className="w-4 h-4 rounded-full bg-[#d97757]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[8px] font-bold text-[#d97757]">
                    {instructorName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {instructorName}
                </span>
              </div>

              <h3 className="font-bold text-foreground text-base leading-snug mb-3">
                {courseName}
              </h3>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{lessonCount} lessons</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Lifetime access</span>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Coupon */}
          <GlassCard padding="sm" className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Coupon code
            </p>
            {appliedCoupon ? (
              <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-3.5 py-2.5">
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
                  className="input-glass flex-1 text-sm"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="px-4 py-2 bg-secondary border border-border rounded-lg text-sm font-semibold text-foreground hover:bg-secondary/70 transition-all disabled:opacity-40 whitespace-nowrap"
                >
                  {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                </button>
              </div>
            )}
            {couponError && (
              <p className="text-xs text-red-500">{couponError}</p>
            )}
          </GlassCard>

          {/* Price breakdown */}
          <GlassCard padding="sm" className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Course price</span>
              <span className={cn(hasDiscount && "line-through text-muted-foreground/60")}>
                ₹{originalPrice.toLocaleString("en-IN")}
              </span>
            </div>
            {initialPrice < originalPrice && (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span>Sale discount</span>
                <span className="font-medium">−₹{(originalPrice - initialPrice).toLocaleString("en-IN")}</span>
              </div>
            )}
            {appliedCoupon && (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span>Coupon ({appliedCoupon.code})</span>
                <span className="font-medium">−₹{appliedCoupon.discount.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="border-t border-border pt-2.5 flex items-center justify-between">
              <span className="font-bold text-foreground">Total today</span>
              <span className="font-bold text-lg text-foreground">
                ₹{displayPrice.toLocaleString("en-IN")}
              </span>
            </div>
            {savings > 0 && (
              <div className="flex items-center justify-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                <Tag className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  You save ₹{savings.toLocaleString("en-IN")} on this purchase
                </p>
              </div>
            )}
          </GlassCard>
        </div>

        {/* ── Right column: what's included + CTA + trust ── */}
        <div className="lg:col-span-3 space-y-4">
          <GlassCard padding="lg">
            <h2 className="text-lg font-bold text-foreground mb-1">
              Complete your purchase
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Pay with Card or UPI — entire checkout stays on this page.
            </p>

            {/* What's included */}
            <div className="mb-6 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                What&apos;s included
              </p>
              <ul className="space-y-2.5">
                {[
                  "Lifetime access to all lessons",
                  "Stream on any device",
                  "Certificate of completion",
                  "30-day money-back guarantee",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-foreground/80">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Payment method pills */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { icon: CreditCard, label: "Card",  sub: "Visa · MC · RuPay" },
                { icon: Smartphone, label: "UPI",   sub: "GPay · PhonePe · Paytm" },
              ].map(({ icon: Icon, label, sub }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-md bg-[#d97757]/10 border border-[#d97757]/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[#d97757]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2.5 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* CTA button */}
            <button
              type="submit"
              disabled={proceeding}
              className="w-full btn-primary py-4 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {proceeding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Preparing checkout…
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  {displayPrice === 0
                    ? "Enroll for Free"
                    : `Proceed to Pay ₹${displayPrice.toLocaleString("en-IN")}`}
                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                </>
              )}
            </button>

            {/* Trust badges */}
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2.5">
              {[
                { icon: Lock,        text: "256-bit SSL encryption" },
                { icon: ShieldCheck, text: "Secured by Razorpay" },
                { icon: Calendar,    text: "30-day money-back guarantee" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {text}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

      </div>
    </form>
  );
}
