"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard, BookOpen, Users, Video, ClipboardCheck,
  MessageCircle, Megaphone, BarChart3, Settings, Copy, Globe, Lock,
  ClipboardList, ExternalLink, Sparkles,
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
import AssignmentsTab from "./tabs/AssignmentsTab";
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

type TabDef = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const TAB_GROUPS: ReadonlyArray<{ label: string; tabs: TabDef[] }> = [
  {
    label: "Manage",
    tabs: [
      { id: "overview",   label: "Overview",   icon: LayoutDashboard },
      { id: "courses",    label: "Courses",    icon: BookOpen },
      { id: "students",   label: "Students",   icon: Users },
    ],
  },
  {
    label: "Engage",
    tabs: [
      { id: "live",          label: "Live",          icon: Video },
      { id: "attendance",    label: "Attendance",    icon: ClipboardCheck },
      { id: "assignments",   label: "Assignments",   icon: ClipboardList },
      { id: "discussion",    label: "Discussion",    icon: MessageCircle },
      { id: "announcements", label: "Announcements", icon: Megaphone },
    ],
  },
  {
    label: "Analyze",
    tabs: [
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "settings",  label: "Settings",  icon: Settings },
    ],
  },
];

const TABS: TabDef[] = TAB_GROUPS.flatMap((g) => g.tabs);
type TabId =
  | "overview" | "courses" | "students"
  | "live" | "attendance" | "assignments" | "discussion" | "announcements"
  | "analytics" | "settings";

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

  const isPublished = cls.status === "PUBLISHED";

  return (
    <div className="px-4 max-w-7xl mx-auto pb-12">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden mb-4 border border-border">
        {cls.banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cls.banner} alt="" className="w-full h-56 object-cover" />
        ) : (
          <div className="w-full h-56 bg-gradient-to-br from-amber-500/30 via-orange-500/15 to-violet-500/20 relative">
            {/* Subtle dotted pattern overlay */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(circle, currentColor 1px, transparent 1px)",
                backgroundSize: "24px 24px",
                color: "rgba(255,255,255,0.2)",
              }}
            />
          </div>
        )}
        {/* Dark overlay so text stays legible on any banner */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Floating action group */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {isPublished && (
            <Link href={`/classes/${cls.slug}`} target="_blank">
              <Button size="sm" variant="secondary" className="backdrop-blur bg-black/40 border-white/20 text-white hover:bg-black/60">
                <ExternalLink className="w-3.5 h-3.5" /> Preview
              </Button>
            </Link>
          )}
          {cls.inviteCode && (
            <Button
              size="sm"
              variant="secondary"
              onClick={copyInvite}
              className="backdrop-blur bg-black/40 border-white/20 text-white hover:bg-black/60"
            >
              <Copy className="w-3.5 h-3.5" /> Invite link
            </Button>
          )}
          <Button size="sm" onClick={togglePublish} disabled={busy}>
            {isPublished ? "Unpublish" : (<><Sparkles className="w-3.5 h-3.5" /> Publish</>)}
          </Button>
        </div>

        {/* Title block */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Pill tone={isPublished ? "emerald" : "amber"}>{cls.status}</Pill>
            <Pill tone="slate">
              {cls.visibility === "PUBLIC" ? (
                <><Globe className="w-3 h-3" /> Public</>
              ) : (
                <><Lock className="w-3 h-3" /> Private</>
              )}
            </Pill>
            <Pill tone="slate">{cls.joinMode.replace("_", " ").toLowerCase()}</Pill>
            {cls.isPaid && <Pill tone="violet">Paid</Pill>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-sm">
            {cls.name}
          </h1>
          {cls.description && (
            <p className="text-sm text-white/80 mt-1 line-clamp-1 max-w-2xl">
              {cls.description}
            </p>
          )}
        </div>
      </div>

      {/* ── KPI strip ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        <KpiTile
          icon={Users}
          label="Students"
          value={cls._count.enrollments}
          tone="emerald"
        />
        <KpiTile
          icon={BookOpen}
          label="Courses"
          value={cls.courses.length}
          tone="amber"
        />
        <KpiTile
          icon={Video}
          label="Live sessions"
          value={cls._count.liveSessions}
          tone="violet"
        />
        <KpiTile
          icon={cls.startDate ? LayoutDashboard : ClipboardList}
          label={cls.startDate ? "Starts" : "Cohort start"}
          value={
            cls.startDate
              ? new Date(cls.startDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
              : "TBD"
          }
          tone="sky"
        />
      </div>

      {/* ── Tabs layout ─────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Mobile: horizontal scroll */}
        <nav className="lg:hidden flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-thin">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as TabId)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                tab === id
                  ? "bg-amber-500/15 text-amber-400 border border-amber-400/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        {/* Desktop: grouped sidebar */}
        <aside className="hidden lg:block lg:w-60 shrink-0">
          <nav className="space-y-5 sticky top-20">
            {TAB_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 mb-1.5 px-2">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.tabs.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setTab(id as TabId)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        tab === id
                          ? "bg-amber-500/10 text-foreground border border-amber-400/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          {tab === "overview"      && <OverviewTab cls={cls} onJumpTab={(t) => setTab(t as TabId)} />}
          {tab === "courses"       && <CoursesTab cls={cls} />}
          {tab === "students"      && <StudentsTab classId={cls.id} />}
          {tab === "live"          && <LiveSessionsTab classId={cls.id} />}
          {tab === "attendance"    && <AttendanceTab classId={cls.id} />}
          {tab === "assignments"   && <AssignmentsTab classId={cls.id} />}
          {tab === "discussion"    && (
            <DiscussionTab classId={cls.id} currentUserId={cls.instructorId} />
          )}
          {tab === "announcements" && <AnnouncementsTab classId={cls.id} />}
          {tab === "analytics"     && <AnalyticsTab classId={cls.id} />}
          {tab === "settings"      && <SettingsTab cls={cls} onRefresh={onRefresh} />}
        </main>
      </div>

      <div className="text-xs text-muted-foreground mt-8">
        <Link href="/instructor/classes" className="hover:text-foreground">
          ← Back to all classes
        </Link>
      </div>
    </div>
  );
}

// ─── Small presentational helpers ───────────────────────────────────────────

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "emerald" | "amber" | "slate" | "violet";
}) {
  const tones = {
    emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
    amber: "bg-amber-500/20 text-amber-300 border-amber-400/40",
    slate: "bg-white/10 text-white/90 border-white/20",
    violet: "bg-violet-500/20 text-violet-300 border-violet-400/40",
  } as const;
  return (
    <span
      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border backdrop-blur-sm inline-flex items-center gap-1 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function KpiTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone: "amber" | "emerald" | "violet" | "sky";
}) {
  const tones = {
    amber: "text-amber-400 bg-amber-500/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
    violet: "text-violet-400 bg-violet-500/10",
    sky: "text-sky-400 bg-sky-500/10",
  } as const;
  return (
    <div className="glass p-3 sm:p-4 rounded-xl flex items-center gap-3">
      <div
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${tones[tone]}`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="text-lg sm:text-xl font-bold tabular-nums truncate">
          {value}
        </div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
