"use client";

import { motion } from "framer-motion";
import {
  BookOpen, Clock, Globe, Award, Smartphone, Download,
  Infinity, Shield, Edit3, Share2, CheckCircle2,
  Crown, Lock, Zap, TrendingUp,
} from "lucide-react";
import { useState } from "react";
import EnrollButton from "./EnrollButton";
import WishlistButton from "@/components/WishlistButton";
import Link from "next/link";
import toast from "react-hot-toast";
import type { PlanAccess } from "@/services/subscription.service";
import { BASIC_COURSE_LIMIT } from "@/services/subscription.service";

interface Props {
  courseId: string;
  price: number | null;
  discountPrice: number | null;
  isFree: boolean;
  courseMinPlan: string;
  isEnrolled: boolean;
  /** Subscriber has access rights but hasn't explicitly enrolled yet (no slot consumed) */
  canAccessViaSub: boolean;
  isWishlisted: boolean;
  isLoggedIn: boolean;
  userRole: string | null;
  lessonCount: number;
  totalDuration: number;
  language: string;
  level: string;
  planAccess: PlanAccess | null;
}

export default function CourseSidebar({
  courseId, price, discountPrice, isFree, courseMinPlan,
  isEnrolled, canAccessViaSub, isWishlisted, isLoggedIn, userRole,
  lessonCount, totalDuration, language, level,
  planAccess,
}: Props) {
  const [copied, setCopied] = useState(false);
  const discountNum = discountPrice ? Number(discountPrice) : null;
  const hasDiscount = !isFree && discountNum && price && discountNum < price;

  const hasActiveSub  = Boolean(planAccess?.isActive && planAccess.canAccessPaidCourses);
  const isProOnly     = courseMinPlan === "PRO" || courseMinPlan === "ENTERPRISE";
  const planBlocked   = hasActiveSub && isProOnly && !planAccess?.canAccessProCourses;
  const limitReached  = hasActiveSub && planAccess?.limitReached && !isProOnly && !planBlocked;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }

  // ── Subscription status banner ─────────────────────────────────────────────
  function SubscriptionBanner() {
    if (!planAccess || !planAccess.isPaid || isFree) return null;

    // BASIC user trying to access a PRO-only course
    if (planBlocked) {
      return (
        <div className="flex items-start gap-2.5 bg-purple-500/10 border border-purple-400/20 rounded-xl px-3 py-2.5 mb-3">
          <Lock className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-purple-300 text-xs font-semibold">PRO Plan Required</p>
            <p className="text-purple-400/60 text-[11px]">
              This course requires a PRO subscription.{" "}
              <Link href="/pricing" className="text-purple-300 underline">Upgrade →</Link>
            </p>
          </div>
        </div>
      );
    }

    // BASIC user at course limit
    if (limitReached) {
      return (
        <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-400/20 rounded-xl px-3 py-2.5 mb-3">
          <TrendingUp className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-amber-300 text-xs font-semibold">
              {planAccess!.enrolledCount}/{BASIC_COURSE_LIMIT} course slots used
            </p>
            <p className="text-amber-400/60 text-[11px]">
              <Link href="/pricing" className="text-amber-300 underline">Upgrade to PRO</Link> for unlimited access.
            </p>
          </div>
        </div>
      );
    }

    // Active subscription — show plan badge
    if (hasActiveSub) {
      const isUnlimited = planAccess!.plan === "PRO" || planAccess!.plan === "ENTERPRISE";
      return (
        <div className="flex items-center gap-2.5 bg-orange-500/10 border border-orange-400/20 rounded-xl px-3 py-2.5 mb-3">
          <Crown className="w-4 h-4 text-orange-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-orange-300 text-xs font-semibold">
              Included in your {planAccess!.plan} plan
            </p>
            <p className="text-orange-400/60 text-[11px]">
              {isUnlimited
                ? "Unlimited course access"
                : `${planAccess!.enrolledCount} of ${BASIC_COURSE_LIMIT} course slots used`}
            </p>
          </div>
          {/* Slot usage bar for BASIC */}
          {!isUnlimited && (
            <div className="w-12 flex-shrink-0">
              <div className="w-full bg-orange-900/40 rounded-full h-1">
                <div
                  className="bg-orange-400 h-1 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (planAccess!.enrolledCount / BASIC_COURSE_LIMIT) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="backdrop-blur-xl bg-white/[0.07] border border-border rounded-xl overflow-hidden shadow-xl shadow-black/20"
    >
      {/* Price section */}
      <div className="p-4 border-b border-border">
        <SubscriptionBanner />

        {isFree ? (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-emerald-400">Free</span>
            <span className="text-xs text-emerald-400/60 bg-emerald-500/10 px-2 py-0.5 rounded-full">No cost</span>
          </div>
        ) : price && !hasActiveSub ? (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl font-bold text-foreground">
              ₹{hasDiscount ? discountNum!.toLocaleString("en-IN") : price.toLocaleString("en-IN")}
            </span>
            {hasDiscount && (
              <>
                <span className="text-lg text-white/30 line-through">₹{price.toLocaleString("en-IN")}</span>
                <span className="bg-green-500/20 text-green-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-green-400/30">
                  {Math.round(((price - discountNum!) / price) * 100)}% off
                </span>
              </>
            )}
          </div>
        ) : null}

        {/* Action buttons */}
        <div className="mt-3 space-y-4">
          {userRole === "STUDENT" && (
            <EnrollButton
              courseId={courseId}
              isEnrolled={isEnrolled}
              canAccessViaSub={canAccessViaSub}
              isFree={isFree}
              price={hasDiscount ? discountNum : price}
              courseMinPlan={courseMinPlan}
              planAccess={planAccess}
            />
          )}
          {!isLoggedIn && (
            <Link href="/login" className="btn-primary block text-center w-full cta-glow">
              Sign in to Enroll
            </Link>
          )}
          {(userRole === "ADMIN" || userRole === "INSTRUCTOR") && (
            <Link
              href={`/admin/courses/${courseId}/edit`}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Edit3 className="w-4 h-4" /> Edit Course
            </Link>
          )}
          {isLoggedIn && (
            <div className="flex items-center justify-center gap-2">
              <WishlistButton courseId={courseId} initialState={isWishlisted} />
              <span className="text-muted-foreground/70 text-xs">
                {isWishlisted ? "In your wishlist" : "Add to wishlist"}
              </span>
            </div>
          )}
        </div>

        {/* Money-back guarantee — only for non-subscribers on paid courses */}
        {!isEnrolled && !isFree && !hasActiveSub && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.06]"
          >
            <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <p className="text-muted-foreground/70 text-xs leading-relaxed">
              30-day money-back guarantee. Full refund if you&apos;re not satisfied.
            </p>
          </motion.div>
        )}
      </div>

      {/* Course includes */}
      <div className="p-4 space-y-3">
        <h3 className="text-foreground font-semibold text-xs">This course includes</h3>
        <div className="space-y-2">
          <IncludeItem icon={BookOpen} text={`${lessonCount} lessons`} />
          {totalDuration > 0 && (
            <IncludeItem
              icon={Clock}
              text={totalDuration > 60
                ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m of content`
                : `${totalDuration} minutes of content`}
            />
          )}
          <IncludeItem icon={Globe}     text={`${language} language`} />
          <IncludeItem icon={Shield}    text={`${level.charAt(0).toUpperCase() + level.slice(1)} level`} />
          <IncludeItem icon={Infinity}  text="Lifetime access" />
          <IncludeItem icon={Smartphone} text="Access on mobile and desktop" />
          <IncludeItem icon={Award}     text="Certificate of completion" />
          {/* Offline downloads only for PRO+ */}
          {planAccess?.hasOfflineDownloads && (
            <IncludeItem icon={Download} text="Offline downloads available" />
          )}
          {/* Teaser for FREE/BASIC users */}
          {(!planAccess || !planAccess.hasOfflineDownloads) && (
            <IncludeItem icon={Zap}  text="Offline downloads (PRO+)" muted />
          )}
        </div>
      </div>

      {/* Share & Download */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={handleCopyLink}
          className="flex-1 flex items-center justify-center gap-2 text-muted-foreground/70 hover:text-muted-foreground text-[11px] py-2.5 rounded-lg border border-white/[0.06] hover:border-border hover:bg-white/[0.03] transition-all"
        >
          {copied ? (
            <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
          ) : (
            <><Share2 className="w-3.5 h-3.5" /> Share this course</>
          )}
        </button>
        {(isEnrolled || userRole === "ADMIN" || userRole === "INSTRUCTOR") && (
          <button
            onClick={() => { window.location.href = `/api/courses/${courseId}/pdf`; }}
            title="Download Full Course PDF"
            className="w-10 flex-shrink-0 flex items-center justify-center text-muted-foreground/70 hover:text-muted-foreground py-2.5 rounded-lg border border-white/[0.06] hover:border-border hover:bg-white/[0.03] transition-all"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function IncludeItem({
  icon: Icon, text, muted = false,
}: {
  icon: React.ElementType; text: string; muted?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2.5 text-xs group ${muted ? "opacity-40" : "text-muted-foreground"}`}>
      <div className="w-6 h-6 rounded-md bg-white/[0.04] flex items-center justify-center group-hover:bg-orange-500/15 transition-colors">
        <Icon className="w-3 h-3 text-orange-400 flex-shrink-0" />
      </div>
      {text}
    </div>
  );
}
