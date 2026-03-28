"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import GlassCard from "@/components/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import {
  Mail, Globe, Calendar, BookOpen, Award, Star, ShoppingCart,
  HelpCircle, Trash2, Shield, Send, IndianRupee, Zap, Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import XpProgressBar from "@/components/XpProgressBar";
import StreakCounter from "@/components/StreakCounter";
import SendNotificationModal from "../SendNotificationModal";

interface StudentData {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  headline: string | null;
  website: string | null;
  role: string;
  createdAt: string;
  enrollments: {
    id: string;
    courseId: string;
    enrolledAt: string;
    completedAt: string | null;
    course: { id: string; title: string; thumbnail: string | null; totalLessons: number };
    completedLessons: number;
    totalLessons: number;
    progress: number;
  }[];
  orders: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
    course: { id: string; title: string } | null;
  }[];
  certificates: {
    id: string;
    issuedAt: string;
    course: { id: string; title: string };
  }[];
  quizAttempts: {
    id: string;
    score: number;
    passed: boolean;
    timeTaken: number | null;
    createdAt: string;
    quiz: { id: string; title: string; passMark: number };
  }[];
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    course: { id: string; title: string };
  }[];
  counts: {
    enrollments: number;
    certificates: number;
    orders: number;
    reviews: number;
    quizAttempts: number;
  };
  totalSpent: number;
  gamification: {
    xp: number;
    level: number;
    levelLabel: string;
    levelColor: string;
    streak: number;
    longestStreak: number;
    nextLevelProgress: { current: number; required: number; progress: number };
    badges: { key: string; name: string; description: string; icon: string; xpReward: number; earned: boolean; earnedAt: string | null }[];
    earnedCount: number;
    recentXpEvents: { id: string; action: string; xp: number; createdAt: string }[];
  };
}

const tabs = [
  { key: "gamification", label: "Gamification", icon: Zap },
  { key: "enrollments", label: "Enrollments", icon: BookOpen },
  { key: "orders", label: "Orders", icon: ShoppingCart },
  { key: "certificates", label: "Certificates", icon: Award },
  { key: "quizzes", label: "Quiz History", icon: HelpCircle },
  { key: "reviews", label: "Reviews", icon: Star },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const ACTION_LABELS: Record<string, string> = {
  LESSON_COMPLETE: "Lesson completed",
  QUIZ_PASS: "Quiz passed",
  DAILY_STREAK: "Daily streak",
  BADGE_REWARD: "Badge reward",
};

export default function StudentDetail({ student }: { student: StudentData }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("gamification");
  const [showNotify, setShowNotify] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentRole, setCurrentRole] = useState(student.role);

  const getProgressColor = (p: number) => {
    if (p === 100) return "bg-emerald-500";
    if (p >= 50) return "bg-blue-500";
    if (p >= 25) return "bg-amber-500";
    return "bg-red-500";
  };

  const handleRoleChange = async (newRole: string) => {
    setRoleLoading(true);
    try {
      const res = await fetch(`/api/admin/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) setCurrentRole(newRole);
    } catch { /* ignore */ } finally {
      setRoleLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/students/${student.id}`, { method: "DELETE" });
      if (res.ok) router.push("/admin/students");
    } catch { /* ignore */ } finally {
      setDeleteLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, "green" | "amber" | "red" | "blue" | "gray"> = {
      PAID: "green", PENDING: "amber", FAILED: "red", REFUNDED: "blue",
    };
    return <Badge variant={map[status] || "gray"}>{status}</Badge>;
  };

  return (
    <div className="space-y-5">

      {/* ── Profile Header ──────────────────────────────────────────────── */}
      <GlassCard>
        <div className="flex flex-col sm:flex-row gap-5">

          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-orange-600/30 to-orange-500/20 border border-border flex items-center justify-center overflow-hidden">
              {student.avatar ? (
                <Image src={student.avatar} alt={student.name} width={80} height={80} className="w-20 h-20 object-cover" />
              ) : (
                <span className="text-3xl font-bold text-orange-400/60">
                  {student.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
              <div>
                <h1 className="text-xl font-bold text-foreground leading-tight">{student.name}</h1>
                {student.headline && (
                  <p className="text-muted-foreground text-sm mt-0.5">{student.headline}</p>
                )}
              </div>
              <Badge variant={currentRole === "ADMIN" ? "red" : currentRole === "INSTRUCTOR" ? "amber" : "blue"}>
                {currentRole}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-orange-400/70" /> {student.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-orange-400/70" /> Joined {formatDate(student.createdAt)}
              </span>
              {student.website && (
                <a href={student.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <Globe className="w-3.5 h-3.5 text-orange-400/70" /> Website
                </a>
              )}
            </div>

            {student.bio && (
              <p className="text-muted-foreground/60 text-xs mt-2 line-clamp-2">{student.bio}</p>
            )}

            {/* Inline gamification pills */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs font-semibold text-orange-400">
                <Zap className="w-3 h-3" /> {student.gamification.xp.toLocaleString()} XP
              </span>
              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary border border-border text-xs font-semibold", student.gamification.levelColor)}>
                Lv.{student.gamification.level} {student.gamification.levelLabel}
              </span>
              {student.gamification.streak > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs font-semibold text-orange-400">
                  🔥 {student.gamification.streak}-day streak
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary border border-border text-xs text-muted-foreground">
                🏅 {student.gamification.earnedCount}/{student.gamification.badges.length} badges
              </span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* ── Stats Row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Enrolled",   value: student.counts.enrollments,  icon: BookOpen,     color: "text-blue-400",    bg: "bg-blue-500/10" },
          { label: "Certs",      value: student.counts.certificates,  icon: Award,        color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Orders",     value: student.counts.orders,        icon: ShoppingCart, color: "text-orange-400",  bg: "bg-orange-500/10" },
          { label: "Spent",      value: `₹${student.totalSpent.toLocaleString()}`, icon: IndianRupee, color: "text-yellow-400", bg: "bg-yellow-500/10" },
          { label: "Reviews",    value: student.counts.reviews,       icon: Star,         color: "text-amber-400",   bg: "bg-amber-500/10" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <GlassCard key={s.label} padding="sm" className="flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", s.bg)}>
                <Icon className={cn("w-4 h-4", s.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-foreground leading-tight">{s.value}</p>
                <p className="text-muted-foreground/60 text-xs">{s.label}</p>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <GlassCard padding="sm">
        <div className="flex flex-wrap items-center gap-2 px-1">
          <Button variant="primary" size="sm" onClick={() => setShowNotify(true)}>
            <Send className="w-3.5 h-3.5" /> Notify
          </Button>

          <div className="flex items-center gap-2 border-l border-border pl-3 ml-1">
            <Shield className="w-3.5 h-3.5 text-muted-foreground/50" />
            <select
              value={currentRole}
              onChange={(e) => handleRoleChange(e.target.value)}
              disabled={roleLoading}
              className="bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-foreground text-xs focus:outline-none focus:border-orange-400/30 transition-all"
            >
              <option value="STUDENT">Student</option>
              <option value="INSTRUCTOR">Instructor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="ml-auto">
            {!showDeleteConfirm ? (
              <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-xs font-medium">Confirm delete?</span>
                <Button variant="danger" size="sm" loading={deleteLoading} onClick={handleDelete}>Yes, Delete</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const count = tab.key === "gamification"
            ? student.gamification.earnedCount
            : tab.key === "quizzes"
            ? student.counts.quizAttempts
            : student.counts[tab.key as keyof typeof student.counts];
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap border",
                isActive
                  ? "bg-orange-500/10 text-foreground border-orange-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", isActive ? "text-orange-400" : "text-muted-foreground/50")} />
              {tab.label}
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md font-semibold",
                isActive ? "bg-orange-500/20 text-orange-300" : "bg-secondary text-muted-foreground/50"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────── */}
      <GlassCard padding="sm">

        {/* Gamification */}
        {activeTab === "gamification" && (
          <div className="p-4 space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <XpProgressBar
                xp={student.gamification.xp}
                level={student.gamification.level}
                levelLabel={student.gamification.levelLabel}
                levelColor={student.gamification.levelColor}
                nextLevelProgress={student.gamification.nextLevelProgress}
              />
              <StreakCounter streak={student.gamification.streak} longestStreak={student.gamification.longestStreak} />
            </div>

            {/* Badges */}
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                Badges — {student.gamification.earnedCount} / {student.gamification.badges.length} earned
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {student.gamification.badges.map((badge) => (
                  <div key={badge.key} title={badge.description}
                    className={cn(
                      "flex flex-col items-center text-center gap-1.5 p-3 rounded-xl border transition-all",
                      badge.earned ? "bg-orange-500/5 border-orange-500/20" : "bg-secondary/20 border-border opacity-40"
                    )}
                  >
                    <span className={cn("text-2xl leading-none", !badge.earned && "grayscale opacity-60")}>{badge.icon}</span>
                    <p className={cn("text-[11px] font-semibold leading-tight", badge.earned ? "text-foreground" : "text-muted-foreground")}>
                      {badge.name}
                    </p>
                    {badge.earned && badge.earnedAt && (
                      <span className="text-[9px] text-orange-400/50 leading-none">
                        {new Date(badge.earnedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* XP Log */}
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                Recent XP Activity
              </p>
              {student.gamification.recentXpEvents.length === 0 ? (
                <p className="text-muted-foreground/40 text-sm text-center py-6">No XP earned yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {student.gamification.recentXpEvents.map((e) => (
                    <div key={e.id} className="flex items-center justify-between py-2.5 px-2 hover:bg-secondary/50 rounded-lg transition-colors">
                      <span className="text-sm text-muted-foreground">
                        {ACTION_LABELS[e.action] ?? e.action.replace(/_/g, " ").toLowerCase()}
                      </span>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-[11px] text-muted-foreground/40">
                          {new Date(e.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-xs font-bold text-orange-400 w-16 text-right">+{e.xp} XP</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enrollments */}
        {activeTab === "enrollments" && (
          <div>
            <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-muted-foreground/60 text-[11px] font-semibold uppercase tracking-wider border-b border-border">
              <div className="col-span-4">Course</div>
              <div className="col-span-3">Progress</div>
              <div className="col-span-2">Enrolled</div>
              <div className="col-span-3 text-right">Status</div>
            </div>
            <div className="divide-y divide-border/50">
              {student.enrollments.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground/50 text-sm">No enrollments yet.</p>
              ) : student.enrollments.map((e) => (
                <div key={e.id} className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-secondary/40 transition-colors">
                  <div className="col-span-4 min-w-0">
                    <p className="text-foreground text-sm font-medium truncate">{e.course.title}</p>
                    <p className="text-muted-foreground/50 text-xs">{e.completedLessons}/{e.totalLessons} lessons</p>
                  </div>
                  <div className="col-span-3">
                    <div className="w-full bg-secondary rounded-full h-1.5 mb-1">
                      <div className={cn("h-1.5 rounded-full", getProgressColor(e.progress))} style={{ width: `${e.progress}%` }} />
                    </div>
                    <span className="text-muted-foreground/50 text-[11px]">{e.progress}%</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground/50 text-xs">{formatDate(e.enrolledAt)}</span>
                  </div>
                  <div className="col-span-3 text-right">
                    {e.completedAt ? <Badge variant="green">Completed</Badge>
                      : e.progress > 0 ? <Badge variant="blue">In Progress</Badge>
                      : <Badge variant="gray">Not Started</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders */}
        {activeTab === "orders" && (
          <div>
            <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-muted-foreground/60 text-[11px] font-semibold uppercase tracking-wider border-b border-border">
              <div className="col-span-3">Order ID</div>
              <div className="col-span-4">Course</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-1">Date</div>
              <div className="col-span-2 text-right">Status</div>
            </div>
            <div className="divide-y divide-border/50">
              {student.orders.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground/50 text-sm">No orders yet.</p>
              ) : student.orders.map((o) => (
                <div key={o.id} className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-secondary/40 transition-colors">
                  <div className="col-span-3 text-muted-foreground/50 text-xs font-mono truncate">{o.id.slice(0, 10)}…</div>
                  <div className="col-span-4 min-w-0">
                    <p className="text-foreground text-sm truncate">{o.course?.title || "—"}</p>
                  </div>
                  <div className="col-span-2 text-foreground text-sm font-semibold">
                    {o.currency === "INR" ? "₹" : o.currency}{o.amount.toLocaleString()}
                  </div>
                  <div className="col-span-1">
                    <span className="text-muted-foreground/50 text-xs">{formatDate(o.createdAt)}</span>
                  </div>
                  <div className="col-span-2 text-right">{statusBadge(o.status)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certificates */}
        {activeTab === "certificates" && (
          <div>
            <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-muted-foreground/60 text-[11px] font-semibold uppercase tracking-wider border-b border-border">
              <div className="col-span-8">Course</div>
              <div className="col-span-4 text-right">Issued</div>
            </div>
            <div className="divide-y divide-border/50">
              {student.certificates.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground/50 text-sm">No certificates yet.</p>
              ) : student.certificates.map((c) => (
                <div key={c.id} className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-secondary/40 transition-colors">
                  <div className="col-span-8 flex items-center gap-2 min-w-0">
                    <Award className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-foreground text-sm truncate">{c.course.title}</span>
                  </div>
                  <div className="col-span-4 text-right text-muted-foreground/50 text-xs">{formatDate(c.issuedAt)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quiz History */}
        {activeTab === "quizzes" && (
          <div>
            <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-muted-foreground/60 text-[11px] font-semibold uppercase tracking-wider border-b border-border">
              <div className="col-span-4">Quiz</div>
              <div className="col-span-2 text-center">Score</div>
              <div className="col-span-2 text-center">Pass Mark</div>
              <div className="col-span-2 text-center">Time</div>
              <div className="col-span-2 text-right">Result</div>
            </div>
            <div className="divide-y divide-border/50">
              {student.quizAttempts.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground/50 text-sm">No quiz attempts yet.</p>
              ) : student.quizAttempts.map((a) => (
                <div key={a.id} className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-secondary/40 transition-colors">
                  <div className="col-span-4 min-w-0">
                    <p className="text-foreground text-sm truncate">{a.quiz.title}</p>
                    <p className="text-muted-foreground/50 text-xs">{formatDate(a.createdAt)}</p>
                  </div>
                  <div className="col-span-2 text-center font-semibold text-sm text-foreground">{a.score}%</div>
                  <div className="col-span-2 text-center text-muted-foreground text-sm">{a.quiz.passMark}%</div>
                  <div className="col-span-2 text-center text-muted-foreground text-sm">
                    {a.timeTaken ? `${Math.floor(a.timeTaken / 60)}m ${a.timeTaken % 60}s` : "—"}
                  </div>
                  <div className="col-span-2 text-right">
                    <Badge variant={a.passed ? "green" : "red"}>{a.passed ? "Passed" : "Failed"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {activeTab === "reviews" && (
          <div className="divide-y divide-border/50">
            {student.reviews.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground/50 text-sm">No reviews yet.</p>
            ) : student.reviews.map((r) => (
              <div key={r.id} className="px-4 py-4 hover:bg-secondary/40 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-foreground text-sm font-medium">{r.course.title}</span>
                  <span className="text-muted-foreground/50 text-xs">{formatDate(r.createdAt)}</span>
                </div>
                <div className="flex items-center gap-1 mb-1.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className={cn("w-3.5 h-3.5", i < r.rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/20")} />
                  ))}
                  <span className="text-muted-foreground/50 text-xs ml-1">{r.rating}/5</span>
                </div>
                {r.comment && <p className="text-muted-foreground/70 text-sm">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}

      </GlassCard>

      {showNotify && (
        <SendNotificationModal studentId={student.id} studentName={student.name} onClose={() => setShowNotify(false)} />
      )}
    </div>
  );
}
