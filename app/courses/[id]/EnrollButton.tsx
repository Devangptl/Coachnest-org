/**
 * EnrollButton — Client Component for enrolling in a course.
 * Handles: free enrollment and paid Stripe checkout.
 * Plan functionality (BASIC, PRO, ENTERPRISE) has been removed.
 */
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, Tag, X, PlayCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Props {
  courseId: string;
  isEnrolled: boolean;
  /** Order was refunded — student lost access; show Re-enroll CTA */
  isRefunded?: boolean;
  isFree: boolean;
  price: number | null;
  /** ID of the first lesson (or first incomplete lesson) to link "Continue Learning" */
  firstLessonId?: string;
}

interface CouponData {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discount: number;
  description: string | null;
}

export default function EnrollButton({
  courseId, isEnrolled: initialEnrolled,
  isRefunded = false, isFree, price,
  firstLessonId,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isPaymentRedirect = searchParams.get("payment") === "success";

  const [enrolled, setEnrolled] = useState(initialEnrolled);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(isPaymentRedirect && !initialEnrolled);

  useEffect(() => {
    setEnrolled(initialEnrolled);
    if (initialEnrolled) setVerifying(false);
  }, [initialEnrolled]);

  useEffect(() => {
    function onVerified() { setVerifying(false); setEnrolled(true); }
    window.addEventListener("payment:verified", onVerified);
    return () => window.removeEventListener("payment:verified", onVerified);
  }, []);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null);

  const originalPrice = price ?? 0;
  const discountAmount = appliedCoupon
    ? appliedCoupon.discountType === "PERCENTAGE"
      ? Math.round(originalPrice * appliedCoupon.discount / 100)
      : Math.min(appliedCoupon.discount, originalPrice)
    : 0;
  const finalPrice = Math.max(0, originalPrice - discountAmount);

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleApplyCoupon() {
    if (!couponCode.trim() || couponLoading) return;
    setCouponLoading(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), courseId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Invalid coupon"); return; }
      setAppliedCoupon(data);
      toast.success("Coupon applied!");
    } catch {
      toast.error("Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() { setAppliedCoupon(null); setCouponCode(""); }

  async function handleEnroll() {
    if (enrolled || loading) return;

    if (!isFree && price) {
      // Redirect to in-app checkout — no Stripe redirect
      const params = new URLSearchParams();
      if (appliedCoupon?.code) params.set("coupon", appliedCoupon.code);
      router.push(`/checkout/course/${courseId}${params.size ? `?${params}` : ""}`);
      return;
    }

    // Free enrollment — do it inline
    setLoading(true);
    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      if (res.ok) {
        setEnrolled(true);
        toast.success("Enrolled successfully!");
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Enrollment failed.");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // ── Render states ──────────────────────────────────────────────────────────

  if (verifying) {
    return (
      <div className="flex items-center gap-2 bg-orange-500/15 border border-[#d97757]/25 rounded-md px-4 py-3 text-orange-300 text-sm font-medium justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        Verifying payment…
      </div>
    );
  }

  if (enrolled) {
    const lessonHref = firstLessonId
      ? `/courses/${courseId}/lessons/${firstLessonId}`
      : `/courses/${courseId}`;
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 rounded-md px-3 py-2.5 text-emerald-400 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Enrolled
        </div>
        <Link
          href={lessonHref}
          className="btn-primary px-4 py-2.5 font-semibold"
        >
          <PlayCircle className="w-4 h-4 flex-shrink-0" />
          Continue Learning
        </Link>
      </div>
    );
  }

  // Refunded — student lost access; offer re-purchase
  if (isRefunded && !enrolled) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-400/20 rounded-md px-4 py-3 text-red-300 text-sm font-medium justify-center">
          <RotateCcw className="w-4 h-4 flex-shrink-0" />
          Your purchase was refunded
        </div>
        <button
          onClick={handleEnroll}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md border border-[#d97757]/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
            : <><RotateCcw className="w-4 h-4" /> Re-enroll{price ? ` — ₹${price.toLocaleString("en-IN")}` : ""}</>
          }
        </button>
      </div>
    );
  }

  // Standard enroll (free or paid)
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
      {/* Coupon input — only for paid courses */}
      {!isFree && price && (
        <div className="w-full sm:w-auto flex-shrink-0">
          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3.5 shadow-inner h-[46px]">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-emerald-400 text-sm font-semibold tracking-wide">
                  {appliedCoupon.code}
                </span>
                <span className="text-emerald-400/80 text-[11px] font-medium bg-emerald-500/20 px-1.5 py-0.5 rounded-md">
                  -{appliedCoupon.discountType === "PERCENTAGE" ? `${appliedCoupon.discount}%` : `₹${appliedCoupon.discount}`}
                </span>
              </div>
              <button
                onClick={removeCoupon}
                className="ml-3 p-1 rounded-md hover:bg-emerald-500/20 text-emerald-400/70 hover:text-emerald-400 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-black/20 border border-white/[0.08] hover:border-white/[0.15] focus-within:border-orange-500/40 focus-within:bg-black/40 rounded-md p-1 transition-all shadow-inner w-full sm:w-[220px] h-[46px]">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                placeholder="Enter coupon code"
                className="flex-1 min-w-0 bg-transparent px-3 text-sm text-foreground w-full placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponCode.trim()}
                className="px-3 py-1.5 bg-white/[0.08] hover:bg-white/[0.12] text-foreground text-sm font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-white/[0.04] flex-shrink-0 flex items-center justify-center min-w-[60px]"
              >
                {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Price breakdown - Desktop inline */}
      {!isFree && price && appliedCoupon && (
        <div className="hidden sm:flex flex-col justify-center px-4 h-[46px] bg-black/20 border border-white/[0.06] rounded-md shadow-inner flex-shrink-0 min-w-max">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-[11px] line-through">₹{originalPrice.toLocaleString("en-IN")}</span>
            <span className="text-emerald-400 text-[11px] font-medium">-₹{discountAmount.toLocaleString("en-IN")}</span>
          </div>
          <span className="text-foreground font-bold text-[13px] leading-tight mt-0.5">Total: ₹{finalPrice.toLocaleString("en-IN")}</span>
        </div>
      )}

      {/* Price breakdown - Mobile Only */}
      {!isFree && price && appliedCoupon && (
        <div className="sm:hidden bg-black/20 border border-white/[0.06] rounded-md p-3 space-y-1.5 w-full shadow-inner">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Price</span>
            <span className="text-muted-foreground font-medium">₹{originalPrice.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-emerald-400">Discount</span>
            <span className="text-emerald-400 font-medium">-₹{discountAmount.toLocaleString("en-IN")}</span>
          </div>
          <div className="h-px w-full bg-white/[0.06] my-1" />
          <div className="flex justify-between items-center">
            <span className="text-foreground font-medium">Total</span>
            <span className="text-foreground font-bold text-lg">₹{finalPrice.toLocaleString("en-IN")}</span>
          </div>
        </div>
      )}

      {/* Enroll button */}
      <button
        onClick={handleEnroll}
        disabled={loading}
        className="w-full sm:w-auto h-[46px] relative overflow-hidden btn-primary px-6 font-semibold disabled:opacity-70 disabled:cursor-not-allowed group active:scale-[0.98] flex-shrink-0"
      >
        <span className="relative flex items-center justify-center gap-2 z-10 w-full whitespace-nowrap">
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Processing…</>
          ) : isFree ? "Enroll for Free"
            : appliedCoupon
              ? finalPrice === 0 ? "Enroll Now — Free" : `Enroll Now — ₹${finalPrice.toLocaleString("en-IN")}`
              : price ? `Enroll Now — ₹${price.toLocaleString("en-IN")}`
                : "Enroll Now"}
        </span>
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
      </button>
    </div>
  );
}
