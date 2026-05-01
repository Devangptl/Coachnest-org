"use client";

import { useState } from "react";
import {
  BookOpen, Clock, Globe, Award, Smartphone, Download,
  Infinity, Shield, Zap, Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import type { PlanAccess } from "@/services/subscription.service";

interface Props {
  courseId: string;
  lessonCount: number;
  totalDuration: number;
  language: string;
  level: string;
  isEnrolled: boolean;
  userRole: string | null;
  planAccess: PlanAccess | null;
}

export default function CourseSidebar({
  courseId, lessonCount, totalDuration, language, level,
  isEnrolled, userRole, planAccess,
}: Props) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadPDF() {
    if (downloading) return;
    setDownloading(true);
    const toastId = toast.loading("Generating course PDF…");
    try {
      const res = await fetch(`/api/courses/${courseId}/pdf`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to generate PDF");
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `course-${courseId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded!", { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed", { id: toastId });
    } finally {
      setDownloading(false);
    }
  }

  const durationLabel = totalDuration > 60
    ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`
    : totalDuration > 0 ? `${totalDuration}m` : null;

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          This course includes
        </p>
        {(isEnrolled || userRole === "ADMIN" || userRole === "INSTRUCTOR") && (
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {downloading
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Download className="w-3 h-3" />}
            {downloading ? "Generating…" : "Download PDF"}
          </button>
        )}
      </div>

      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-3">
        <IncludeItem icon={BookOpen} text={`${lessonCount} lesson${lessonCount !== 1 ? "s" : ""}`} />
        {durationLabel && <IncludeItem icon={Clock} text={`${durationLabel} of content`} />}
        <IncludeItem icon={Globe}      text={language} />
        <IncludeItem icon={Shield}     text={`${level.charAt(0).toUpperCase() + level.slice(1)} level`} />
        <IncludeItem icon={Infinity}   text="Lifetime access" />
        <IncludeItem icon={Smartphone} text="Mobile & desktop" />
        <IncludeItem icon={Award}      text="Certificate of completion" />
        {planAccess?.hasOfflineDownloads
          ? <IncludeItem icon={Download} text="Offline downloads" />
          : <IncludeItem icon={Zap} text="Offline downloads (PRO+)" muted />}
      </div>
    </div>
  );
}

function IncludeItem({ icon: Icon, text, muted = false }: {
  icon: React.ElementType; text: string; muted?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 text-xs ${muted ? "text-muted-foreground/40" : "text-muted-foreground"}`}>
      <Icon className="w-3.5 h-3.5 text-[#d97757] flex-shrink-0" />
      <span className="truncate">{text}</span>
    </div>
  );
}
