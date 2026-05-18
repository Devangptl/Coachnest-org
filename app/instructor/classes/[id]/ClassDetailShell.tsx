"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard, BookOpen, Users, Video, ClipboardCheck,
  MessageCircle, Megaphone, BarChart3, Settings, Copy, Globe, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import OverviewTab from "./tabs/OverviewTab";
import CoursesTab from "./tabs/CoursesTab";
import StudentsTab from "./tabs/StudentsTab";
import LiveSessionsTab from "./tabs/LiveSessionsTab";
import AttendanceTab from "./tabs/AttendanceTab";
import DiscussionTab from "./tabs/DiscussionTab";
import AnnouncementsTab from "./tabs/AnnouncementsTab";
import AnalyticsTab from "./tabs/AnalyticsTab";
import SettingsTab from "./tabs/SettingsTab";

type Cls = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  banner: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  joinMode: "OPEN" | "APPROVAL_REQUIRED" | "INVITE_ONLY";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  inviteCode: string | null;
  maxStudents: number | null;
  startDate: Date | null;
  endDate: Date | null;
  price: unknown | null;
  isPaid: boolean;
  enableChat: boolean;
  enableDiscussion: boolean;
  enableAttendance: boolean;
  enableLiveClass: boolean;
  enableLeaderboard: boolean;
  enableCertificate: boolean;
  certCompletionPercent: number;
  certAttendancePercent: number;
  instructorId: string;
  createdAt: Date;
  updatedAt: Date;
  instructor: { id: string; name: string; avatar: string | null };
  courses: Array<{
    id: string;
    courseId: string;
    order: number;
    isRequired: boolean;
    course: { id: string; title: string; slug: string; thumbnail: string | null; totalLessons: number };
  }>;
  _count: { enrollments: number; liveSessions: number };
};

const TABS = [
  { id: "overview",      label: "Overview",      icon: LayoutDashboard },
  { id: "courses",       label: "Courses",       icon: BookOpen },
  { id: "students",      label: "Students",      icon: Users },
  { id: "live",          label: "Live Sessions", icon: Video },
  { id: "attendance",    label: "Attendance",    icon: ClipboardCheck },
  { id: "discussion",    label: "Discussion",    icon: MessageCircle },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "analytics",     label: "Analytics",     icon: BarChart3 },
  { id: "settings",      label: "Settings",      icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ClassDetailShell({
  cls,
  initialTab,
  onRefresh,
}: {
  cls: NonNullable<Cls>;
  initialTab: string;
  onRefresh?: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>(
    (TABS.find((t) => t.id === initialTab)?.id as TabId) ?? "overview",
  );
  const [busy, setBusy] = useState(false);

  async function togglePublish() {
    setBusy(true);
    try {
      const res = await fetch(`/api/classes/${cls.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: cls.status === "PUBLISHED" ? "unpublish" : "publish",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(cls.status === "PUBLISHED" ? "Unpublished" : "Published!");
      onRefresh?.();
      router.refresh();
    } catch {
      toast.error("Could not update");
    } finally {
      setBusy(false);
    }
  }

  async function copyInvite() {
    if (!cls.inviteCode) return;
    const url = `${window.location.origin}/classes/${cls.slug}?invite=${cls.inviteCode}`;
    await navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
  }

  return (
    <div className="px-4 max-w-7xl mx-auto">
      {/* Banner */}
      <div className="rounded-xl overflow-hidden mb-4 relative">
        {cls.banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cls.banner} alt="" className="w-full h-40 object-cover" />
        ) : (
          <div className="w-full h-32 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15" />
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
              cls.status === "PUBLISHED"
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-400/30"
                : "bg-amber-500/15 text-amber-400 border-amber-400/30"
            }`}>{cls.status}</span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border bg-secondary text-muted-foreground border-border flex items-center gap-1">
              {cls.visibility === "PUBLIC" ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {cls.visibility}
            </span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
              {cls.joinMode.replace("_", " ")}
            </span>
          </div>
          <h1 className="text-2xl font-bold">{cls.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {cls._count.enrollments} students · {cls.courses.length} courses · {cls._count.liveSessions} live sessions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {cls.inviteCode && (
            <Button variant="secondary" size="sm" onClick={copyInvite}>
              <Copy className="w-4 h-4" /> Copy invite link
            </Button>
          )}
          <Button onClick={togglePublish} disabled={busy} size="sm">
            {cls.status === "PUBLISHED" ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </div>

      {/* Tabs layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        <aside className="lg:w-56 shrink-0">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id as TabId)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  tab === id
                    ? "bg-amber-500/10 text-foreground border border-amber-400/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          {tab === "overview" && <OverviewTab cls={cls} />}
          {tab === "courses" && <CoursesTab cls={cls} />}
          {tab === "students" && <StudentsTab classId={cls.id} />}
          {tab === "live" && <LiveSessionsTab classId={cls.id} />}
          {tab === "attendance" && <AttendanceTab classId={cls.id} />}
          {tab === "discussion" && <DiscussionTab classId={cls.id} />}
          {tab === "announcements" && <AnnouncementsTab classId={cls.id} />}
          {tab === "analytics" && <AnalyticsTab classId={cls.id} />}
          {tab === "settings" && <SettingsTab cls={cls} onRefresh={onRefresh} />}
        </main>
      </div>

      <div className="text-xs text-muted-foreground mt-6">
        <Link href="/instructor/classes" className="hover:text-foreground">← Back to all classes</Link>
      </div>
    </div>
  );
}
