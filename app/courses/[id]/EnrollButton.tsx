/**
 * EnrollButton — Client Component for enrolling in a course.
 * Handles: free enrollment, paid Stripe checkout, subscriber direct-access,
 * BASIC plan limit enforcement, and PRO-only course gating.
 */
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, Tag, X, Crown, Lock } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { PlanAccess } from "@/services/subscription.service";
import { BASIC_COURSE_LIMIT } from "@/services/subscription.service";

interface Props {
  courseId: string;
  isEnrolled: boolean;
  /** Subscriber has plan access rights — clicking "Access Now" will enroll and consume a slot */
  canAccessViaSub: boolean;
  isFree: boolean;
  price: number | null;
  courseMinPlan: string;
  planAccess: PlanAccess | null;
}

interface CouponData {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discount: number;
  description: string | null;
}

export default function EnrollButton({
  courseId, isEnrolled: initialEnrolled, canAccessViaSub, isFree, price,
  courseMinPlan, planAccess,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isPaymentRedirect = searchParams.get("payment") === "success";

  const [enrolled,  setEnrolled]  = useState(initialEnrolled);
  const [loading,   setLoading]   = useState(false);
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
  const [couponCode,    setCouponCode]    = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null);

  const originalPrice   = price ?? 0;
  const discountAmount  = appliedCoupon
    ? appliedCoupon.discountType === "PERCENTAGE"
      ? Math.round(originalPrice * appliedCoupon.discount / 100)
      : Math.min(appliedCoupon.discount, originalPrice)
    : 0;
  const finalPrice = Math.max(0, originalPrice - discountAmount);

  // ── Derived access state ───────────────────────────────────────────────────
  const hasActiveSub    = Boolean(planAccess?.isActive && planAccess.canAccessPaidCourses);
  const isProOnly       = courseMinPlan === "PRO" || courseMinPlan === "ENTERPRISE";
  const planBlocked     = hasActiveSub && isProOnly && !planAccess?.canAccessProCourses;
  const limitReached    = hasActiveSub && planAccess?.limitReached && !isProOnly && !planBlocked;

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

  async function handleSubscriptionEnroll() {
    if (enrolled || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const data = await res.json();
      if (res.ok) {
        setEnrolled(true);
        if (data.alreadyEnrolled) {
          toast.success("Already enrolled. Start learning now!");
        } else if (data.enrollmentLimit !== null) {
          const remaining = data.slotsRemaining ?? 0;
          toast.success(
            remaining > 0
              ? `Enrolled! ${remaining} of ${data.enrollmentLimit} slot${remaining !== 1 ? "s" : ""} remaining.`
              : `Enrolled! All ${data.enrollmentLimit} course slots used. Upgrade for more.`
          );
        } else {
          toast.success("You're in! Start learning now.");
        }
        // Switch to the curriculum tab so the user lands directly on lesson content
        window.dispatchEvent(new CustomEvent("course:open-curriculum"));
        router.refresh();
      } else {
        toast.error(data.error ?? "Enrollment failed.");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnroll() {
    if (enrolled || loading) return;
    setLoading(true);
    try {
      if (!isFree && price) {
        const orderRes = await fetch("/api/payments/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId, couponCode: appliedCoupon?.code }),
        });
        if (!orderRes.ok) {
          const data = await orderRes.json();
          toast.error(data.error ?? "Failed to create order.");
          return;
        }
        const { url } = await orderRes.json();
        if (url) window.location.href = url;
        else toast.error("Could not initiate checkout. Please try again.");
      } else {
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

  // ── Render states ──────────────────────────────────────────────────────────

  if (verifying) {
    return (
      <div className="flex items-center gap-2 bg-orange-500/15 border border-orange-400/25 rounded-xl px-4 py-3 text-orange-300 text-sm font-medium justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        Verifying payment…
      </div>
    );
  }

  if (enrolled) {
    return (
      <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-4 py-3 text-emerald-400 text-sm font-medium justify-center">
        <CheckCircle2 className="w-4 h-4" />
        {hasActiveSub ? "Enrolled via subscription" : "Enrolled"}
      </div>
    );
  }

  // PRO-only course — BASIC subscriber blocked
  if (planBlocked) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-400/20 rounded-xl px-4 py-3 text-purple-300 text-sm font-medium justify-center">
          <Lock className="w-4 h-4" />
          PRO Plan Required
        </div>
        <Link
          href="/pricing"
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-purple-400/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-sm font-medium transition-colors"
        >
          <Crown className="w-4 h-4" /> Upgrade to PRO
        </Link>
      </div>
    );
  }

  // BASIC user at limit
  if (limitReached) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-400/20 rounded-xl px-4 py-3 text-amber-300 text-sm font-medium justify-center">
          <Lock className="w-4 h-4" />
          {planAccess!.enrolledCount}/{BASIC_COURSE_LIMIT} slots used
        </div>
        <Link
          href="/pricing"
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-orange-400/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 text-sm font-medium transition-colors"
        >
          <Crown className="w-4 h-4" /> Upgrade for Unlimited Access
        </Link>
      </div>
    );
  }

  // Subscriber has plan access — show "Access Now" to enroll and consume a slot
  if (canAccessViaSub) {
    return (
      <button
        onClick={handleSubscriptionEnroll}
        disabled={loading}
        className="btn-primary flex items-center justify-center gap-2 py-2 px-6 text-sm"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Enrolling…</>
        ) : (
          <><Crown className="w-4 h-4" /> Access Now</>
        )}
      </button>
    );
  }

  // Standard enroll (free or paid without subscription)
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
              <button onClick={removeCoupon} className="text-muted-foreground/70 hover:text-muted-foreground transition-colors">
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
                className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-orange-400/25 transition-colors"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponCode.trim()}
                className="px-4 py-2 bg-card border border-border rounded-xl text-sm text-muted-foreground hover:text-white hover:bg-white/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Price breakdown */}
      {!isFree && price && appliedCoupon && (
        <div className="bg-secondary rounded-xl px-3 py-2 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Price</span>
            <span>₹{originalPrice.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between text-emerald-400">
            <span>Discount</span>
            <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between text-white font-semibold border-t border-border pt-1">
            <span>Total</span>
            <span>₹{finalPrice.toLocaleString("en-IN")}</span>
          </div>
        </div>
      )}

      {/* Enroll button */}
      <button
        onClick={handleEnroll}
        disabled={loading}
        className="btn-primary flex items-center justify-center gap-2 py-2 px-6 text-sm"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
        ) : isFree ? "Enroll Now — Free"
          : appliedCoupon
            ? finalPrice === 0 ? "Enroll Now — Free with Coupon" : `Enroll Now — ₹${finalPrice.toLocaleString("en-IN")}`
            : price ? `Enroll Now — ₹${price.toLocaleString("en-IN")}`
            : "Enroll Now"}
      </button>
    </div>
  );
}
