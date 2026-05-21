"use client";

import {
  Shield, Share2, CheckCircle2, Edit3,
  BookOpen, Clock, Globe, Award, Smartphone, Download,
  Infinity, PlayCircle, Trophy, Sparkles, Zap, Play, Signal,
} from "lucide-react";
import { useState } from "react";
import Image from "next/image";
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
  thumbnail: string | null;
  title: string;
}

export default function CourseEnrollBar({
  courseId, price, discountPrice, isFree,
  isEnrolled, isRefunded,
  isWishlisted, isLoggedIn, userRole,
  lessonCount, totalDuration, language, level,
  firstLessonId,
  completedCount = 0,
  nextLessonTitle,
  thumbnail,
  title,
}: Props) {
  const [copied,          setCopied]          = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);

  async function downloadCertificate() {
    if (downloadingCert) return;
    setDownloadingCert(true);
    try {
      const res = await fetch(`/api/certificates/${courseId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to generate certificate");
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `certificate-${courseId}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Certificate downloaded!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingCert(false);
    }
  }

  const discountNum  = discountPrice ? Number(discountPrice) : null;
  const hasDiscount  = !isFree && discountNum && price && discountNum < price;
  const displayPrice = hasDiscount ? discountNum! : price;
  const discountPct  = hasDiscount ? Math.round(((price! - discountNum!) / price!) * 100) : 0;
  const progressPct  = lessonCount > 0 ? Math.round((completedCount / lessonCount) * 100) : 0;
  const isCompleted  = progressPct === 100;
  const continueHref = firstLessonId
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

  const ActionButtons = () => (
    <div className="flex items-center gap-1.5">
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

  const includeItems = [
    { icon: BookOpen,   text: `${lessonCount} lesson${lessonCount !== 1 ? "s" : ""}`,         iconBg: "bg-blue-500/10",   iconColor: "text-blue-500 dark:text-blue-400"   },
    ...(durationLabel ? [{ icon: Clock,  text: `${durationLabel} of content`,                 iconBg: "bg-sky-500/10",    iconColor: "text-sky-500 dark:text-sky-400"     }] : []),
    { icon: Globe,      text: language,                                                         iconBg: "bg-teal-500/10",   iconColor: "text-teal-500 dark:text-teal-400"   },
    { icon: Signal,     text: `${level.charAt(0).toUpperCase() + level.slice(1)} level`,       iconBg: "bg-amber-500/10",  iconColor: "text-amber-500 dark:text-amber-400" },
    { icon: Infinity,   text: "Lifetime access",                                                iconBg: "bg-green-500/10",  iconColor: "text-green-500 dark:text-green-400" },
    { icon: Smartphone, text: "Mobile & desktop",                                               iconBg: "bg-violet-500/10", iconColor: "text-violet-500 dark:text-violet-400" },
    { icon: Award,      text: "Certificate of completion",                                      iconBg: "bg-orange-500/10", iconColor: "text-orange-500 dark:text-orange-400" },
    { icon: Download,   text: "Offline downloads",                                              iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500 dark:text-indigo-400" },
  ];

  // ── Thumbnail card ────────────────────────────────────────────────────────
  const ThumbnailCard = () => (
    <div className="relative aspect-video w-full overflow-hidden rounded-t-md bg-gradient-to-br from-orange-500/20 to-orange-700/20 group">
      {thumbnail ? (
        <Image
          src={thumbnail}
          alt={title}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 380px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <BookOpen className="w-16 h-16 text-muted-foreground/20" />
        </div>
      )}
      {/* Play overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
          <Play className="w-6 h-6 text-white ml-1" />
        </div>
      </div>
    </div>
  );

  // ── ENROLLED VIEW ─────────────────────────────────────────────────────────
  if (isEnrolled && userRole === "STUDENT") {
    return (
      <div className="border border-border rounded-md overflow-hidden">
        <ThumbnailCard />

        {/* Progress + CTA */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
              isCompleted
                ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-400/30"
                : "text-green-600 dark:text-green-400 bg-green-500/10 border-green-400/30"
            }`}>
              {isCompleted ? <Trophy className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
              {isCompleted ? "Completed" : "Enrolled"}
            </span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {completedCount} / {lessonCount} lessons
            </span>
          </div>

          {!isCompleted && nextLessonTitle && completedCount > 0 && (
            <p className="text-xs text-muted-foreground truncate">
              Next: <span className="text-foreground font-medium">{nextLessonTitle}</span>
            </p>
          )}

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 h-2 bg-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isCompleted ? "bg-amber-500" : "bg-orange-500"
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className={`text-xs font-bold tabular-nums w-9 text-right ${
              isCompleted ? "text-amber-500" : "text-orange-500"
            }`}>
              {progressPct}%
            </span>
          </div>

          {/* CTA row */}
          <div className="flex items-center gap-2">
            <Link
              href={continueHref}
              className="btn-primary inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold"
            >
              {isCompleted
                ? <><Sparkles className="w-4 h-4" /> Review Course</>
                : <><PlayCircle className="w-4 h-4" /> {completedCount === 0 ? "Start Learning" : "Continue"}</>}
            </Link>
            <ActionButtons />
          </div>

          {/* Certificate download — visible once ≥90% complete */}
          {progressPct >= 90 && (
            <button
              onClick={downloadCertificate}
              disabled={downloadingCert}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md border border-amber-400/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors disabled:opacity-50"
            >
              {downloadingCert
                ? <div className="w-3.5 h-3.5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                : <Award className="w-3.5 h-3.5" />}
              {downloadingCert ? "Generating certificate…" : isCompleted ? "Download Certificate" : `Download Certificate (${progressPct}% done)`}
            </button>
          )}
        </div>

        {/* Course includes */}
        <div className="border-t border-border px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" />
              This course includes
            </p>
            <button
              onClick={() => { window.location.href = `/api/courses/${courseId}/pdf`; }}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Download className="w-3 h-3" /> PDF
            </button>
          </div>
          <div className="grid grid-cols-2 gap-y-2 gap-x-3">
            {includeItems.map((item) => (
              <IncludeItem key={item.text} icon={item.icon} text={item.text} iconBg={item.iconBg} iconColor={item.iconColor} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── NON-ENROLLED VIEW ─────────────────────────────────────────────────────
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <ThumbnailCard />

      {/* Price + CTA */}
      <div className="p-4 space-y-3">
        {/* Price row */}
        <div className="flex items-center justify-between">
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
          <ActionButtons />
        </div>

        {/* Enroll CTA */}
        <div className="flex flex-col gap-2">
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
            <Link
              href="/login"
              className="btn-primary inline-flex w-full items-center justify-center px-5 py-2.5 text-sm font-semibold"
            >
              Sign in to Enroll
            </Link>
          )}
          {(userRole === "ADMIN" || userRole === "INSTRUCTOR") && (
            <Link
              href={`/${userRole == "ADMIN" ? "admin" : "instructor"}/courses/${courseId}/edit`}
              className="btn-primary inline-flex w-full items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Course
            </Link>
          )}
        </div>

        {!isFree && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
            <Shield className="w-3.5 h-3.5 flex-shrink-0" />
            30-day money-back guarantee
          </p>
        )}
      </div>

      {/* This course includes */}
      <div className="border-t border-border px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-primary" />
            This course includes
          </p>
          {(userRole === "ADMIN" || userRole === "INSTRUCTOR") && (
            <button
              onClick={() => { window.location.href = `/api/courses/${courseId}/pdf`; }}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Download className="w-3 h-3" /> PDF
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-y-2 gap-x-3">
          {includeItems.map((item) => (
            <IncludeItem key={item.text} icon={item.icon} text={item.text} iconBg={item.iconBg} iconColor={item.iconColor} />
          ))}
        </div>
      </div>
    </div>
  );
}

function IncludeItem({
  icon: Icon, text, iconColor,
}: {
  icon: React.ElementType;
  text: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${iconColor}`} />
      <span className="truncate">{text}</span>
    </div>
  );
}
