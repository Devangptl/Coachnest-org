"use client";

import { motion } from "framer-motion";
import {
  Shield, Share2, CheckCircle2, Crown, Edit3,
  BookOpen, Clock, Globe, Award, Smartphone, Download,
  Infinity, Zap,
} from "lucide-react";
import { useState } from "react";
import EnrollButton from "./EnrollButton";
import WishlistButton from "@/components/WishlistButton";
import Link from "next/link";
import toast from "react-hot-toast";
import type { PlanAccess } from "@/services/subscription.service";

interface Props {
  courseId: string;
  price: number | null;
  discountPrice: number | null;
  isFree: boolean;
  courseMinPlan: string;
  isEnrolled: boolean;
  canAccessViaSub: boolean;
  isWishlisted: boolean;
  isLoggedIn: boolean;
  userRole: string | null;
  planAccess: PlanAccess | null;
  // --- newly added props for course includes ---
  lessonCount: number;
  totalDuration: number;
  language: string;
  level: string;
}

export default function CourseEnrollBar({
  courseId, price, discountPrice, isFree, courseMinPlan,
  isEnrolled, canAccessViaSub, isWishlisted, isLoggedIn, userRole,
  planAccess,
  lessonCount, totalDuration, language, level,
}: Props) {
  const [copied, setCopied] = useState(false);
  const discountNum = discountPrice ? Number(discountPrice) : null;
  const hasDiscount = !isFree && discountNum && price && discountNum < price;

  const hasActiveSub = Boolean(planAccess?.isActive && planAccess.canAccessPaidCourses);

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

  // ── Subscription badge (inline) ────────────────────────────────────────────
  function SubBadge() {
    if (!planAccess || !planAccess.isPaid || isFree || !hasActiveSub) return null;
    return (
      <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-400/20 rounded-lg px-2.5 py-1.5">
        <Crown className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
        <span className="text-orange-300 text-xs font-medium whitespace-nowrap">
          {planAccess!.plan} plan
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="backdrop-blur-xl bg-white/[0.04] border border-border rounded-2xl overflow-hidden shadow-sm"
    >
      {/* ── Top section: Price, Enroll, Actions ── */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-white/[0.06]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          {/* Price section */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {isFree ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-emerald-400">Free</span>
                <span className="text-[10px] text-emerald-400/60 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  No cost
                </span>
              </div>
            ) : price && !hasActiveSub ? (
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-2xl sm:text-3xl font-bold text-foreground">
                  ₹{hasDiscount ? discountNum!.toLocaleString("en-IN") : price.toLocaleString("en-IN")}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-sm sm:text-base text-white/30 line-through">
                      ₹{price.toLocaleString("en-IN")}
                    </span>
                    <span className="bg-green-500/20 text-green-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-green-400/30">
                      {Math.round(((price - discountNum!) / price) * 100)}% off
                    </span>
                  </>
                )}
              </div>
            ) : null}
            <SubBadge />
          </div>

          {/* Enroll button — flex grow removed so it stays compact */}
          <div className="border-t sm:border-t-0 sm:border-l border-white/[0.06] pt-4 sm:pt-0 sm:pl-6 ml-auto">
            <div className="flex flex-col sm:flex-row items-end gap-3">
              <div className="w-full sm:w-auto">
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
                  <Link href="/login" className="btn-primary inline-flex items-center justify-center cta-glow py-2 px-6">
                    Sign in to Enroll
                  </Link>
                )}
                {(userRole === "ADMIN" || userRole === "INSTRUCTOR") && (
                  <Link
                    href={`/admin/courses/${courseId}/edit`}
                    className="btn-primary inline-flex items-center justify-center gap-2 py-2 px-6"
                  >
                    <Edit3 className="w-4 h-4" /> Edit Course
                  </Link>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex w-full sm:w-auto gap-2 justify-center sm:justify-start flex-shrink-0 mt-3 sm:mt-0">
                {/* Wishlist */}
                {isLoggedIn && (
                  <WishlistButton 
                    courseId={courseId} 
                    initialState={isWishlisted} 
                    className="flex-shrink-0 !w-[46px] !h-[46px] flex items-center justify-center shadow-inner !rounded-xl" 
                  />
                )}

                {/* Share */}
                <button
                  onClick={handleCopyLink}
                  className="flex-shrink-0 w-[46px] h-[46px] flex items-center justify-center rounded-xl border border-white/[0.08] hover:border-white/[0.15] bg-black/20 hover:bg-black/30 text-muted-foreground/70 hover:text-foreground transition-all shadow-inner"
                  title="Share this course"
                >
                  {copied ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Money-back guarantee — subtle inline */}
            {!isEnrolled && !isFree && !hasActiveSub && (
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                <Shield className="w-3.5 h-3.5 text-emerald-400/80 flex-shrink-0" />
                <p className="text-muted-foreground/50 text-[11px] leading-relaxed text-center sm:text-left">
                  30-day money-back guarantee. Full refund if you&apos;re not satisfied.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom section: Course Includes ── */}
      <div className="bg-black/10 px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
          <h3 className="text-foreground font-semibold text-sm">This course includes</h3>
          
          {/* Download PDF button only for enrolled/admins */}
          {(isEnrolled || userRole === "ADMIN" || userRole === "INSTRUCTOR") && (
            <button
              onClick={() => { window.location.href = `/api/courses/${courseId}/pdf`; }}
              title="Download Full Course PDF"
              className="flex items-center gap-2 text-muted-foreground/70 hover:text-muted-foreground text-[11px] font-medium px-3 py-2 rounded-lg border border-white/[0.06] hover:border-border hover:bg-white/[0.03] transition-all w-full sm:w-auto justify-center"
            >
              <Download className="w-3.5 h-3.5" />
              Download Course PDF
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
          
          {planAccess?.hasOfflineDownloads ? (
            <IncludeItem icon={Download} text="Offline downloads" />
          ) : (
            <IncludeItem icon={Zap}  text="Offline downloads (PRO+)" muted />
          )}
        </div>
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
    <div className={`flex items-center gap-3 text-xs group ${muted ? "opacity-50" : "text-muted-foreground"}`}>
      <div className="w-7 h-7 rounded-lg bg-orange-500/5 group-hover:bg-orange-500/15 border border-orange-500/10 flex items-center justify-center transition-colors">
        <Icon className="w-3.5 h-3.5 text-orange-400/80 flex-shrink-0" />
      </div>
      <span className="font-medium whitespace-nowrap">{text}</span>
    </div>
  );
}
