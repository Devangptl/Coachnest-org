"use client";

import {
  Shield, Share2, CheckCircle2, Edit3,
  BookOpen, Clock, Globe, Award, Smartphone, Download,
  Infinity, PlayCircle, Trophy, Sparkles, Zap,
} from "lucide-react";
import { useState } from "react";
import EnrollButton from "./EnrollButton";
import WishlistButton from "@/components/WishlistButton";
import Link from "next/link";
import toast from "react-hot-toast";

interface Props {
  courseId: string;
  price: number | null;
  discountPrice: number | null;
  isFree: boolean;
  isEnrolled: boolean;
  isRefunded: boolean;
  isWishlisted: boolean;
  isLoggedIn: boolean;
  userRole: string | null;
  lessonCount: number;
  totalDuration: number;
  language: string;
  level: string;
  firstLessonId?: string;
  completedCount?: number;
  nextLessonTitle?: string;
}

export default function CourseEnrollBar({
  courseId, price, discountPrice, isFree,
  isEnrolled, isRefunded,
  isWishlisted, isLoggedIn, userRole,
  lessonCount, totalDuration, language, level,
  firstLessonId,
  completedCount = 0,
  nextLessonTitle,
}: Props) {
  const [copied, setCopied] = useState(false);
  const discountNum   = discountPrice ? Number(discountPrice) : null;
  const hasDiscount   = !isFree && discountNum && price && discountNum < price;
  const displayPrice  = hasDiscount ? discountNum! : price;
  const discountPct   = hasDiscount ? Math.round(((price! - discountNum!) / price!) * 100) : 0;
  const progressPct   = lessonCount > 0 ? Math.round((completedCount / lessonCount) * 100) : 0;
  const isCompleted   = progressPct === 100;
  const continueHref  = firstLessonId
    ? `/courses/${courseId}/lessons/${firstLessonId}`
    : `/courses/${courseId}`;

  const durationLabel = totalDuration > 60
    ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`
    : totalDuration > 0 ? `${totalDuration}m` : null;

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

  // ── Shared action buttons (wishlist + share) ──────────────────────────────
  const ActionButtons = () => (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {isLoggedIn && (
        <WishlistButton
          courseId={courseId}
          initialState={isWishlisted}
          className="!w-9 !h-9 flex items-center justify-center"
        />
      )}
      <button
        onClick={handleCopyLink}
        className="w-9 h-9 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        title="Share this course"
      >
        {copied
          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
          : <Share2 className="w-4 h-4" />}
      </button>
    </div>
  );

  // ── Include items list ────────────────────────────────────────────────────
  const includeItems = [
    { icon: BookOpen,   text: `${lessonCount} lesson${lessonCount !== 1 ? "s" : ""}` },
    ...(durationLabel ? [{ icon: Clock, text: `${durationLabel} of content` }] : []),
    { icon: Globe,      text: `${language}` },
    { icon: Shield,     text: `${level.charAt(0).toUpperCase() + level.slice(1)} level` },
    { icon: Infinity,   text: "Lifetime access" },
    { icon: Smartphone, text: "Mobile & desktop" },
    { icon: Award,      text: "Certificate of completion" },
    { icon: Download,   text: "Offline downloads" },
  ];

  // ── ENROLLED VIEW ─────────────────────────────────────────────────────────
  if (isEnrolled && userRole === "STUDENT") {
    return (
      <div className="border border-border rounded-md overflow-hidden">

        {/* Progress + CTA */}
        <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${isCompleted ? "text-amber-500" : "text-green-500"}`}>
                {isCompleted ? <Trophy className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                {isCompleted ? "Completed" : "Enrolled"}
              </span>
              <span className="text-muted-foreground/60 text-[11px]">
                {completedCount} / {lessonCount} lessons
              </span>
            </div>

            <p className="text-sm font-medium text-foreground mb-2">
              {isCompleted
                ? "You finished this course!"
                : completedCount === 0
                  ? "Ready to start learning?"
                  : nextLessonTitle
                    ? <>Next: <span className="text-muted-foreground font-normal truncate">{nextLessonTitle}</span></>
                    : "Pick up where you left off"}
            </p>

            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${isCompleted ? "bg-amber-500" : "bg-orange-500"}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className={`text-xs font-semibold tabular-nums ${isCompleted ? "text-amber-500" : "text-orange-500"}`}>
                {progressPct}%
              </span>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href={continueHref}
              className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold whitespace-nowrap"
            >
              {isCompleted
                ? <><Sparkles className="w-4 h-4" /> Review</>
                : <><PlayCircle className="w-4 h-4" /> {completedCount === 0 ? "Start" : "Continue"}</>}
            </Link>
            <ActionButtons />
          </div>
        </div>

        {/* Course resources */}
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course resources</p>
            <button
              onClick={() => { window.location.href = `/api/courses/${courseId}/pdf`; }}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Download className="w-3 h-3" /> Download PDF
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-3">
            {includeItems.slice(0, 6).map((item) => (
              <IncludeItem key={item.text} icon={item.icon} text={item.text} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── NON-ENROLLED VIEW ─────────────────────────────────────────────────────
  return (
    <div className="border border-border rounded-md overflow-hidden">

      {/* Price + CTA row */}
      <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">

        {/* Price */}
        <div className="flex items-baseline gap-2 flex-wrap">
          {isFree ? (
            <span className="text-2xl font-bold text-green-500">Free</span>
          ) : displayPrice ? (
            <>
              <span className="text-2xl font-bold text-foreground">
                ₹{displayPrice.toLocaleString("en-IN")}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-sm text-muted-foreground line-through">
                    ₹{price!.toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs font-semibold text-green-500">
                    {discountPct}% off
                  </span>
                </>
              )}
            </>
          ) : null}
        </div>

        {/* Enroll CTA + actions */}
        <div className="flex items-center gap-2 sm:ml-auto">
          {userRole === "STUDENT" && (
            <EnrollButton
              courseId={courseId}
              isEnrolled={isEnrolled}
              isRefunded={isRefunded}
              isFree={isFree}
              price={hasDiscount ? discountNum : price}
              firstLessonId={firstLessonId}
            />
          )}
          {!isLoggedIn && (
            <Link href="/login" className="btn-primary inline-flex items-center justify-center px-5 py-2 text-sm font-semibold">
              Sign in to Enroll
            </Link>
          )}
          {(userRole === "ADMIN" || userRole === "INSTRUCTOR") && (
            <Link
              href={`/admin/courses/${courseId}/edit`}
              className="btn-primary inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Course
            </Link>
          )}
          <ActionButtons />
        </div>
      </div>

      {/* Guarantee */}
      {!isFree && (
        <div className="px-4 pb-3 flex items-center gap-1.5 text-xs text-muted-foreground/60">
          <Shield className="w-3.5 h-3.5 flex-shrink-0" />
          30-day money-back guarantee. Full refund if not satisfied.
        </div>
      )}

      {/* This course includes */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">This course includes</p>
          {(userRole === "ADMIN" || userRole === "INSTRUCTOR") && (
            <button
              onClick={() => { window.location.href = `/api/courses/${courseId}/pdf`; }}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Download className="w-3 h-3" /> Download PDF
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-3">
          {includeItems.map((item) => (
            <IncludeItem key={item.text} icon={item.icon} text={item.text} />
          ))}
        </div>
      </div>
    </div>
  );
}

function IncludeItem({ icon: Icon, text, muted = false }: {
  icon: React.ElementType; text: string; muted?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 text-xs ${muted ? "text-muted-foreground/40" : "text-muted-foreground"}`}>
      <Icon className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
      <span className="truncate">{text}</span>
    </div>
  );
}
