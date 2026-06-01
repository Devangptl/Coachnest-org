"use client";

import { useState, FormEvent, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Lock, ArrowLeft, BookOpen, Tag, X,
  Loader2, ShieldCheck, ChevronRight, Calendar, Sparkles,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import RazorpayCustomForm, {
  type RazorpayOrderInfo,
} from "@/components/checkout/RazorpayCustomForm";
import type { RazorpaySuccessResponse } from "@/types/razorpay";
import GlassCard from "@/components/GlassCard";
import { cn } from "@/lib/utils";
import { calcProcessingFee, PROCESSING_FEE_LABEL } from "@/lib/fees";

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
  platformOffer?: { id: string; title: string; discount: number } | null;
}

type Phase = "summary" | "payment";

export default function CourseCheckoutClient({
  courseId, courseName, instructorName, lessonCount,
  thumbnail, price: initialPrice, originalPrice, initialCoupon, userEmail,
  platformOffer,
}: Props) {
  const router = useRouter();

  const [phase,     setPhase]     = useState<Phase>("summary");
  const [orderInfo, setOrderInfo] = useState<RazorpayOrderInfo | null>(null);

  const [couponCode,    setCouponCode]    = useState(initialCoupon ?? "");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string; label: string; discount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const afterCoupon         = appliedCoupon ? Math.max(0, initialPrice - appliedCoupon.discount) : initialPrice;
  const offerDiscount       = platformOffer ? Math.min(platformOffer.discount, afterCoupon) : 0;
  const goodsTotal          = Math.max(0, afterCoupon - offerDiscount);
  const processingFee       = calcProcessingFee(goodsTotal);
  const displayPrice        = goodsTotal + processingFee;
  const hasDiscount         = originalPrice > initialPrice || !!appliedCoupon || offerDiscount > 0;
  const savings             = originalPrice - goodsTotal;

  const [proceeding, setProceeding] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

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

  async function handleProceed(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setProceeding(true);
    try {
      const res  = await fetch("/api/razorpay/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type: "course", courseId, couponCode: appliedCoupon?.code }),
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

  function handleUpiCaptured() {
    router.push(`/courses/${courseId}?enrolled=true`);
  }

  // ── Phase 2: Payment form ───────────────────────────────────────────────────

  if (phase === "payment" && orderInfo) {
    return (
      <div className="grid lg:grid-cols-5 gap-6 lg:gap-10 items-start">

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
                <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-secondary">
                  <Image src={thumbnail} alt={courseName} fill className="object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-muted-foreground mb-0.5">by {instructorName}</p>
                <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2">{courseName}</h3>
                <p className="text-xs text-muted-foreground mt-1">{lessonCount} lessons · Lifetime access</p>
              </div>
            </div>

            <div className="border-t border-border bg-secondary/20 px-4 py-3 space-y-1.5 text-sm">
              {appliedCoupon && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span className="text-xs">Coupon ({appliedCoupon.code})</span>
                  <span className="text-xs font-medium">−₹{appliedCoupon.discount.toLocaleString("en-IN")}</span>
                </div>
              )}
              {platformOffer && offerDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span className="text-xs">Offer · {platformOffer.title}</span>
                  <span className="text-xs font-medium">−₹{offerDiscount.toLocaleString("en-IN")}</span>
                </div>
              )}
              {processingFee > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span className="text-xs">{PROCESSING_FEE_LABEL}</span>
                  <span className="text-xs font-medium">₹{processingFee.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border/60 pt-1.5">
                <span className="text-xs font-semibold text-foreground">Total</span>
                <span className="font-bold text-foreground">₹{displayPrice.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </GlassCard>
        </div>

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
          {error && <ErrorBanner msg={error} className="mt-3" />}
        </div>

      </div>
    );
  }

  // ── Phase 1: Order summary + proceed button ─────────────────────────────────

  return (
    <form onSubmit={handleProceed}>
      <div className="grid lg:grid-cols-5 gap-6 lg:gap-10 items-start">

        {/* Left: unified product + coupon + price card */}
        <div className="lg:col-span-2 space-y-3">
          <Link
            href={`/courses/${courseId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to course
          </Link>

          <GlassCard padding="sm" className="overflow-hidden !p-0">
            {/* Thumbnail */}
            <div className="relative w-full aspect-video bg-secondary overflow-hidden">
              {thumbnail ? (
                <Image src={thumbnail} alt={courseName} fill className="object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#d97757]/20 to-secondary flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-[#d97757]/40" />
                </div>
              )}
            </div>

            <div className="p-4 space-y-4">
              {/* Course info */}
              <div>
                <div className="inline-flex items-center gap-1.5 bg-secondary/60 border border-border rounded-full px-2.5 py-0.5 mb-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#d97757]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[7px] font-bold text-[#d97757]">{instructorName.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{instructorName}</span>
                </div>
                <h3 className="font-bold text-foreground text-sm leading-snug mb-2">{courseName}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{lessonCount} lessons</span>
                  <span className="flex items-center gap-1"><Lock className="w-3 h-3" />Lifetime access</span>
                </div>
              </div>

              {/* Coupon */}
              <div className="border-t border-border pt-4">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs">{appliedCoupon.code}</span>
                      <span className="text-emerald-600/70 dark:text-emerald-400/70 text-xs">−₹{appliedCoupon.discount.toLocaleString("en-IN")}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}
                      className="p-0.5 rounded hover:bg-emerald-500/20 text-emerald-500/60 hover:text-emerald-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleApplyCoupon())}
                        placeholder="Coupon code"
                        className="input-glass flex-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm font-medium hover:bg-secondary/70 transition-all disabled:opacity-40 whitespace-nowrap"
                      >
                        {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
                      </button>
                    </div>
                    {couponError && <p className="text-xs text-red-500">{couponError}</p>}
                  </div>
                )}
              </div>

              {/* Price breakdown */}
              <div className="border-t border-border pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Course price</span>
                  <span className={cn(hasDiscount && "line-through opacity-50")}>
                    ₹{originalPrice.toLocaleString("en-IN")}
                  </span>
                </div>
                {initialPrice < originalPrice && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Sale discount</span>
                    <span className="font-medium">−₹{(originalPrice - initialPrice).toLocaleString("en-IN")}</span>
                  </div>
                )}
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Coupon ({appliedCoupon.code})</span>
                    <span className="font-medium">−₹{appliedCoupon.discount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {platformOffer && offerDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> {platformOffer.title}
                    </span>
                    <span className="font-medium">−₹{offerDiscount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {processingFee > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{PROCESSING_FEE_LABEL}</span>
                    <span className="font-medium">₹{processingFee.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2.5">
                  <span className="font-bold text-foreground">Total today</span>
                  <span className="font-bold text-lg text-foreground">₹{displayPrice.toLocaleString("en-IN")}</span>
                </div>
                {savings > 0 && (
                  <p className="text-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    You save ₹{savings.toLocaleString("en-IN")}
                  </p>
                )}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right: CTA panel */}
        <div className="lg:col-span-3">
          <GlassCard padding="lg" className="space-y-6">

            {/* Amount */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Order total</p>
              <p className="text-4xl font-bold text-foreground tracking-tight">
                ₹{displayPrice.toLocaleString("en-IN")}
              </p>
              {processingFee > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Includes ₹{processingFee.toLocaleString("en-IN")} processing fee
                </p>
              )}
            </div>

            {error && <ErrorBanner msg={error} />}

            {/* CTA */}
            <button
              type="submit"
              disabled={proceeding}
              className="w-full btn-primary py-4 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {proceeding ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Preparing checkout…</>
              ) : (
                <><Lock className="w-4 h-4 flex-shrink-0" />
                  {displayPrice === 0 ? "Enroll for Free" : `Pay ₹${displayPrice.toLocaleString("en-IN")} securely`}
                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                </>
              )}
            </button>

            {/* Trust */}
            <div className="border-t border-border pt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              {[
                { icon: Lock,        text: "256-bit SSL" },
                { icon: ShieldCheck, text: "Secured by Razorpay" },
                { icon: Calendar,    text: "30-day guarantee" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
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

function ErrorBanner({ msg, className }: { msg: string; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2.5 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3", className)}>
      <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
      {msg}
    </div>
  );
}
