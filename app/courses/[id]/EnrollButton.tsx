/**
 * EnrollButton — Client Component for enrolling in a course.
 * Supports free enrollment, paid courses with Stripe Checkout, and coupon code application.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Tag, X } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  courseId: string;
  isEnrolled: boolean;
  isFree: boolean;
  price: number | null;
}

interface CouponData {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discount: number;
  description: string | null;
}

export default function EnrollButton({ courseId, isEnrolled: initialEnrolled, isFree, price }: Props) {
  const router = useRouter();
  const [enrolled, setEnrolled] = useState(initialEnrolled);
  const [loading, setLoading] = useState(false);

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
      if (!res.ok) {
        toast.error(data.error ?? "Invalid coupon");
        return;
      }
      setAppliedCoupon(data);
      toast.success("Coupon applied!");
    } catch {
      toast.error("Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
  }

  async function handleEnroll() {
    if (enrolled || loading) return;
    setLoading(true);

    try {
      if (!isFree && price) {
        // Paid course — create Stripe Checkout Session and redirect
        const orderRes = await fetch("/api/payments/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            couponCode: appliedCoupon?.code || undefined,
          }),
        });

        if (!orderRes.ok) {
          const data = await orderRes.json();
          toast.error(data.error ?? "Failed to create order.");
          return;
        }

        const { url } = await orderRes.json();

        if (url) {
          // Redirect to Stripe Checkout
          window.location.href = url;
        } else {
          toast.error("Could not initiate checkout. Please try again.");
        }
      } else {
        // Free course — direct enrollment
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
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (enrolled) {
    return (
      <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-4 py-3 text-emerald-400 text-sm font-medium justify-center">
        <CheckCircle2 className="w-4 h-4" />
        Enrolled
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Coupon input — only for paid courses */}
      {!isFree && price && (
        <div>
          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-400/20 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-medium">{appliedCoupon.code}</span>
                <span className="text-emerald-400/60 text-xs">
                  (-{appliedCoupon.discountType === "PERCENTAGE" ? `${appliedCoupon.discount}%` : `₹${appliedCoupon.discount}`})
                </span>
              </div>
              <button onClick={removeCoupon} className="text-white/40 hover:text-white/70 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                placeholder="Coupon code"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/50 transition-colors"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponCode.trim()}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Price breakdown with coupon */}
      {!isFree && price && appliedCoupon && (
        <div className="bg-white/5 rounded-xl px-3 py-2 space-y-1 text-sm">
          <div className="flex justify-between text-white/50">
            <span>Price</span>
            <span>₹{originalPrice.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between text-emerald-400">
            <span>Discount</span>
            <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between text-white font-semibold border-t border-white/10 pt-1">
            <span>Total</span>
            <span>₹{finalPrice.toLocaleString("en-IN")}</span>
          </div>
        </div>
      )}

      {/* Enroll button */}
      <button
        onClick={handleEnroll}
        disabled={loading}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Processing…
          </>
        ) : isFree ? (
          "Enroll Now — Free"
        ) : appliedCoupon ? (
          finalPrice === 0 ? "Enroll Now — Free with Coupon" : `Enroll Now — ₹${finalPrice.toLocaleString("en-IN")}`
        ) : price ? (
          `Enroll Now — ₹${price.toLocaleString("en-IN")}`
        ) : (
          "Enroll Now"
        )}
      </button>
    </div>
  );
}
