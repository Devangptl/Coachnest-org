"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="backdrop-blur-xl bg-white/[0.04] border border-border rounded-md p-4 sm:p-5 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h3 className="text-foreground font-semibold text-sm">This course includes</h3>

        {(isEnrolled || userRole === "ADMIN" || userRole === "INSTRUCTOR") && (
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            title="Download Full Course PDF"
            className="flex items-center gap-2 text-muted-foreground/70 hover:text-muted-foreground text-[11px] font-medium px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-border hover:bg-white/[0.03] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Download className="w-3.5 h-3.5" />
            }
            {downloading ? "Generating…" : "Download Course PDF"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <IncludeItem icon={BookOpen} text={`${lessonCount} lessons`} />
        {totalDuration > 0 && (
          <IncludeItem
            icon={Clock}
            text={totalDuration > 60
              ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m of content`
              : `${totalDuration} minutes of content`}
          />
        )}
        <IncludeItem icon={Globe}      text={`${language} language`} />
        <IncludeItem icon={Shield}     text={`${level.charAt(0).toUpperCase() + level.slice(1)} level`} />
        <IncludeItem icon={Infinity}   text="Lifetime access" />
        <IncludeItem icon={Smartphone} text="Access on mobile and desktop" />
        <IncludeItem icon={Award}      text="Certificate of completion" />

        {planAccess?.hasOfflineDownloads ? (
          <IncludeItem icon={Download} text="Offline downloads" />
        ) : (
          <IncludeItem icon={Zap} text="Offline downloads (PRO+)" muted />
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
    <div className={`flex items-center gap-3 text-xs group ${muted ? "opacity-50" : "text-muted-foreground"}`}>
      <div className="w-7 h-7 rounded-lg bg-orange-500/5 group-hover:bg-orange-500/15 border border-orange-500/10 flex items-center justify-center transition-colors">
        <Icon className="w-3.5 h-3.5 text-orange-400/80 flex-shrink-0" />
      </div>
      <span className="font-medium">{text}</span>
    </div>
  );
}
