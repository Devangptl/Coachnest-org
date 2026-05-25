"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MessageCircle,
  MessagesSquare,
  Megaphone,
  PlusCircle,
  UserPlus,
  Users,
  Video,
  XCircle,
  Trophy,
  Shield,
  GraduationCap,
} from "lucide-react";
import type { ActivityItem, ActivityKind } from "@/app/api/classes/[id]/activity/route";

type Cls = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  startDate: Date | string | null;
  endDate: Date | string | null;
  maxStudents: number | null;
  visibility: string;
  joinMode: string;
  enableChat: boolean;
  enableDiscussion: boolean;
  enableAttendance: boolean;
  enableLiveClass: boolean;
  enableLeaderboard: boolean;
  enableCertificate: boolean;
  certCompletionPercent: number;
  certAttendancePercent: number;
  instructor: { id: string; name: string; avatar: string | null };
  courses: Array<{
    id: string;
    courseId: string;
    course: { id: string; title: string; slug: string; thumbnail: string | null; totalLessons: number };
  }>;
  _count: { enrollments: number; liveSessions: number };
};

export default function OverviewTab({
  cls,
  onJumpTab,
}: {
  cls: Cls;
  onJumpTab?: (tabId: string) => void;
}) {
  const [activity, setActivity] = useState<ActivityItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/classes/${cls.id}/activity`)
      .then((r) => r.json())
      .then((d) => !cancelled && setActivity(d.items ?? []))
      .catch(() => !cancelled && setActivity([]))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [cls.id]);

  const features = [
    { key: "chat",        label: "Class chat",       on: cls.enableChat,        Icon: MessageCircle },
    { key: "discussion",  label: "Discussions",      on: cls.enableDiscussion,  Icon: MessagesSquare },
    { key: "live",        label: "Live sessions",    on: cls.enableLiveClass,   Icon: Video },
    { key: "attendance",  label: "Attendance",       on: cls.enableAttendance,  Icon: ClipboardList },
    { key: "leaderboard", label: "Leaderboard",      on: cls.enableLeaderboard, Icon: Trophy },
    { key: "certificate", label: "Certificate",      on: cls.enableCertificate, Icon: GraduationCap },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Description block */}
      {cls.description && (
        <div className="glass p-4 sm:p-5 rounded-xl">
          <h2 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
            About this class
          </h2>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {cls.description}
          </p>
        </div>
      )}

      {/* Two-column: quick actions + features */}
      <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
        {/* Quick actions */}
        <div className="glass p-4 sm:p-5 rounded-xl">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-amber-400" />
            Quick actions
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <ActionTile
              onClick={() => onJumpTab?.("announcements")}
              icon={Megaphone}
              label="Post announcement"
              tone="amber"
            />
            <ActionTile
              onClick={() => onJumpTab?.("live")}
              icon={Video}
              label="Schedule session"
              tone="sky"
            />
            <ActionTile
              onClick={() => onJumpTab?.("assignments")}
              icon={ClipboardList}
              label="New assignment"
              tone="violet"
            />
            <ActionTile
              onClick={() => onJumpTab?.("students")}
              icon={UserPlus}
              label="Manage students"
              tone="emerald"
            />
          </div>
        </div>

        {/* Feature toggles */}
        <div className="glass p-4 sm:p-5 rounded-xl">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            Features
            <button
              onClick={() => onJumpTab?.("settings")}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            >
              Edit →
            </button>
          </h3>
          <div className="grid grid-cols-2 gap-1.5">
            {features.map(({ key, label, on, Icon }) => (
              <div
                key={key}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                  on
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-secondary text-muted-foreground/70"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="truncate flex-1">{label}</span>
                {on ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Courses preview */}
      {cls.courses.length > 0 && (
        <div className="glass p-4 sm:p-5 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              Course curriculum ({cls.courses.length})
            </h3>
            <button
              onClick={() => onJumpTab?.("courses")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Manage →
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {cls.courses.slice(0, 4).map((cc) => (
              <div
                key={cc.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50"
              >
                <div className="w-10 h-10 rounded bg-amber-500/15 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {cc.course.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {cc.course.totalLessons} lessons
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cohort schedule */}
      {(cls.startDate || cls.endDate || cls.maxStudents) && (
        <div className="glass p-4 sm:p-5 rounded-xl">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            Cohort
          </h3>
          <dl className="grid sm:grid-cols-3 gap-3 text-sm">
            <Field
              label="Starts"
              value={
                cls.startDate
                  ? new Date(cls.startDate).toLocaleDateString()
                  : "TBD"
              }
            />
            <Field
              label="Ends"
              value={
                cls.endDate ? new Date(cls.endDate).toLocaleDateString() : "Open"
              }
            />
            <Field
              label="Capacity"
              value={
                cls.maxStudents
                  ? `${cls._count.enrollments} / ${cls.maxStudents}`
                  : "Unlimited"
              }
            />
          </dl>
        </div>
      )}

      {/* Activity timeline */}
      <div className="glass p-4 sm:p-5 rounded-xl">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" />
          Recent activity
        </h3>
        {loading ? (
          <div className="py-6 text-center">
            <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : !activity || activity.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            No activity yet. Once students enroll and you start posting, you&apos;ll
            see it here.
          </div>
        ) : (
          <ol className="relative border-l border-border ml-1.5 space-y-3">
            {activity.map((it) => (
              <ActivityRow key={`${it.kind}:${it.id}`} item={it} onJumpTab={onJumpTab} />
            ))}
          </ol>
        )}
      </div>

      {/* Public link */}
      <div className="text-xs text-muted-foreground text-center">
        Public class page:{" "}
        <Link
          href={`/classes/${cls.slug}`}
          className="text-amber-400 hover:underline"
        >
          /classes/{cls.slug}
        </Link>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function ActionTile({
  onClick,
  icon: Icon,
  label,
  tone,
}: {
  onClick?: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone: "amber" | "emerald" | "violet" | "sky";
}) {
  const tones = {
    amber: "hover:bg-amber-500/10 hover:border-amber-400/30 text-amber-400",
    emerald: "hover:bg-emerald-500/10 hover:border-emerald-400/30 text-emerald-400",
    violet: "hover:bg-violet-500/10 hover:border-violet-400/30 text-violet-400",
    sky: "hover:bg-sky-500/10 hover:border-sky-400/30 text-sky-400",
  } as const;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 p-3 rounded-lg border border-border bg-secondary/40 transition-colors text-left ${tones[tone]}`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-xs font-medium text-foreground">{label}</span>
    </button>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground mb-0.5">
        {label}
      </dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

const KIND_STYLE: Record<
  ActivityKind,
  { tone: string; Icon: React.ComponentType<{ className?: string }>; jumpTab?: string }
> = {
  ENROLLMENT:   { tone: "bg-emerald-500/15 text-emerald-400", Icon: UserPlus,       jumpTab: "students" },
  LIVE_SESSION: { tone: "bg-sky-500/15 text-sky-400",         Icon: Video,          jumpTab: "live" },
  ANNOUNCEMENT: { tone: "bg-amber-500/15 text-amber-400",     Icon: Megaphone,      jumpTab: "announcements" },
  ASSIGNMENT:   { tone: "bg-violet-500/15 text-violet-400",   Icon: ClipboardList,  jumpTab: "assignments" },
  DISCUSSION:   { tone: "bg-sky-500/15 text-sky-400",         Icon: MessagesSquare, jumpTab: "discussion" },
};

function ActivityRow({
  item,
  onJumpTab,
}: {
  item: ActivityItem;
  onJumpTab?: (tabId: string) => void;
}) {
  const style = KIND_STYLE[item.kind];
  const Icon = style.Icon;
  return (
    <li className="ml-4 relative">
      <span
        className={`absolute -left-[26px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center ${style.tone}`}
      >
        <Icon className="w-3 h-3" />
      </span>
      <button
        onClick={() => style.jumpTab && onJumpTab?.(style.jumpTab)}
        className="text-left w-full hover:bg-secondary/50 rounded -mx-2 px-2 py-1 transition-colors"
      >
        <div className="text-sm font-medium leading-tight">{item.title}</div>
        {item.body && (
          <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {item.body}
          </div>
        )}
        <div className="text-[10px] text-muted-foreground/70 mt-0.5">
          {timeAgo(item.at)}
        </div>
      </button>
    </li>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
