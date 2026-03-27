"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import GlassCard from "@/components/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import {
  User, Mail, Globe, Calendar, BookOpen, Award, Star, ShoppingCart,
  HelpCircle, Trash2, Shield, Send, IndianRupee,
} from "lucide-react";
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
}

const tabs = [
  { key: "enrollments", label: "Enrollments", icon: BookOpen },
  { key: "orders", label: "Orders", icon: ShoppingCart },
  { key: "certificates", label: "Certificates", icon: Award },
  { key: "quizzes", label: "Quiz History", icon: HelpCircle },
  { key: "reviews", label: "Reviews", icon: Star },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function StudentDetail({ student }: { student: StudentData }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("enrollments");
  const [showNotify, setShowNotify] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentRole, setCurrentRole] = useState(student.role);

  const getProgressColor = (p: number) => {
    if (p === 100) return "bg-emerald-500";
    if (p >= 75) return "bg-orange-500";
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
      if (res.ok) {
        setCurrentRole(newRole);
      }
    } catch { /* ignore */ } finally {
      setRoleLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/students/${student.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/admin/students");
      }
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
    <div className="space-y-6">
      {/* Profile Header */}
      <GlassCard>
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-orange-600/40 to-orange-500/40 border border-border flex items-center justify-center overflow-hidden">
              {student.avatar ? (
                <Image src={student.avatar} alt={student.name} width={80} height={80} className="w-20 h-20 object-cover" />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">
                  {student.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-white">{student.name}</h1>
                {student.headline && (
                  <p className="text-muted-foreground text-sm mt-0.5">{student.headline}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={currentRole === "ADMIN" ? "red" : currentRole === "INSTRUCTOR" ? "amber" : "blue"}>
                  {currentRole}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-orange-400" /> {student.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-orange-400" /> Joined {formatDate(student.createdAt)}
              </span>
              {student.website && (
                <a
                  href={student.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-orange-400" /> Website
                </a>
              )}
            </div>

            {student.bio && (
              <p className="text-muted-foreground/70 text-sm mt-3 line-clamp-2">{student.bio}</p>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Enrollments", value: student.counts.enrollments, icon: BookOpen, color: "text-blue-400" },
          { label: "Certificates", value: student.counts.certificates, icon: Award, color: "text-emerald-400" },
          { label: "Orders", value: student.counts.orders, icon: ShoppingCart, color: "text-orange-400" },
          { label: "Total Spent", value: `₹${student.totalSpent.toLocaleString()}`, icon: IndianRupee, color: "text-yellow-400" },
          { label: "Reviews", value: student.counts.reviews, icon: Star, color: "text-amber-400" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <GlassCard key={s.label} padding="sm" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                <Icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <div className="text-lg font-bold text-white">{s.value}</div>
                <div className="text-muted-foreground/70 text-xs">{s.label}</div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Actions */}
      <GlassCard padding="sm">
        <div className="flex flex-wrap items-center gap-3 px-2">
          <Button variant="primary" size="sm" onClick={() => setShowNotify(true)}>
            <Send className="w-3.5 h-3.5" /> Send Notification
          </Button>

          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground/70" />
            <select
              value={currentRole}
              onChange={(e) => handleRoleChange(e.target.value)}
              disabled={roleLoading}
              className="bg-secondary border border-border rounded-xl px-3 py-1.5 text-white text-sm focus:outline-none focus:border-orange-400/25 transition-all"
            >
              <option value="STUDENT">Student</option>
              <option value="INSTRUCTOR">Instructor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="ml-auto">
            {!showDeleteConfirm ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Account
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-red-300 text-sm">Are you sure?</span>
                <Button
                  variant="danger"
                  size="sm"
                  loading={deleteLoading}
                  onClick={handleDelete}
                >
                  Confirm Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "bg-gradient-to-r from-orange-600/30 to-orange-500/20 text-white border border-orange-400/25"
                  : "text-muted-foreground hover:text-white hover:bg-secondary border border-transparent"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-orange-400" : "text-muted-foreground/70"}`} />
              {tab.label}
              <span className={`text-xs ${isActive ? "text-orange-300" : "text-white/30"}`}>
                ({student.counts[tab.key === "quizzes" ? "quizAttempts" : tab.key]})
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <GlassCard padding="sm">
        {/* Enrollments Tab */}
        {activeTab === "enrollments" && (
          <div>
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-muted-foreground/70 text-xs font-semibold uppercase tracking-wider border-b border-border">
              <div className="col-span-4">Course</div>
              <div className="col-span-3">Progress</div>
              <div className="col-span-2">Enrolled</div>
              <div className="col-span-3 text-right">Status</div>
            </div>
            <div className="divide-y divide-white/5">
              {student.enrollments.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground/70">No enrollments yet.</div>
              ) : (
                student.enrollments.map((e) => (
                  <div key={e.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-secondary transition-colors">
                    <div className="col-span-4 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{e.course.title}</p>
                      <p className="text-muted-foreground/70 text-xs">{e.completedLessons}/{e.totalLessons} lessons</p>
                    </div>
                    <div className="col-span-3">
                      <div className="w-full bg-secondary rounded-full h-2 mb-1">
                        <div
                          className={`h-2 rounded-full transition-all ${getProgressColor(e.progress)}`}
                          style={{ width: `${e.progress}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground text-xs">{e.progress}%</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground/70 text-xs">{formatDate(e.enrolledAt)}</span>
                    </div>
                    <div className="col-span-3 text-right">
                      {e.completedAt ? (
                        <Badge variant="green">Completed</Badge>
                      ) : e.progress > 0 ? (
                        <Badge variant="blue">In Progress</Badge>
                      ) : (
                        <Badge variant="gray">Not Started</Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div>
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-muted-foreground/70 text-xs font-semibold uppercase tracking-wider border-b border-border">
              <div className="col-span-3">Order ID</div>
              <div className="col-span-3">Course</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2 text-right">Status</div>
            </div>
            <div className="divide-y divide-white/5">
              {student.orders.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground/70">No orders yet.</div>
              ) : (
                student.orders.map((o) => (
                  <div key={o.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-secondary transition-colors">
                    <div className="col-span-3 text-muted-foreground text-xs font-mono truncate">
                      {o.id.slice(0, 12)}...
                    </div>
                    <div className="col-span-3 min-w-0">
                      <p className="text-white text-sm truncate">{o.course?.title || "—"}</p>
                    </div>
                    <div className="col-span-2 text-white text-sm font-medium">
                      {o.currency === "INR" ? "₹" : o.currency}{o.amount.toLocaleString()}
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground/70 text-xs">{formatDate(o.createdAt)}</span>
                    </div>
                    <div className="col-span-2 text-right">
                      {statusBadge(o.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Certificates Tab */}
        {activeTab === "certificates" && (
          <div>
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-muted-foreground/70 text-xs font-semibold uppercase tracking-wider border-b border-border">
              <div className="col-span-6">Course</div>
              <div className="col-span-6 text-right">Issued Date</div>
            </div>
            <div className="divide-y divide-white/5">
              {student.certificates.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground/70">No certificates earned yet.</div>
              ) : (
                student.certificates.map((c) => (
                  <div key={c.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-secondary transition-colors">
                    <div className="col-span-6 flex items-center gap-2">
                      <Award className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-white text-sm truncate">{c.course.title}</span>
                    </div>
                    <div className="col-span-6 text-right text-muted-foreground/70 text-xs">
                      {formatDate(c.issuedAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Quiz History Tab */}
        {activeTab === "quizzes" && (
          <div>
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-muted-foreground/70 text-xs font-semibold uppercase tracking-wider border-b border-border">
              <div className="col-span-4">Quiz</div>
              <div className="col-span-2 text-center">Score</div>
              <div className="col-span-2 text-center">Pass Mark</div>
              <div className="col-span-2 text-center">Time</div>
              <div className="col-span-2 text-right">Result</div>
            </div>
            <div className="divide-y divide-white/5">
              {student.quizAttempts.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground/70">No quiz attempts yet.</div>
              ) : (
                student.quizAttempts.map((a) => (
                  <div key={a.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-secondary transition-colors">
                    <div className="col-span-4 min-w-0">
                      <p className="text-white text-sm truncate">{a.quiz.title}</p>
                      <p className="text-muted-foreground/70 text-xs">{formatDate(a.createdAt)}</p>
                    </div>
                    <div className="col-span-2 text-center text-white font-semibold text-sm">
                      {a.score}%
                    </div>
                    <div className="col-span-2 text-center text-muted-foreground text-sm">
                      {a.quiz.passMark}%
                    </div>
                    <div className="col-span-2 text-center text-muted-foreground text-sm">
                      {a.timeTaken ? `${Math.floor(a.timeTaken / 60)}m ${a.timeTaken % 60}s` : "—"}
                    </div>
                    <div className="col-span-2 text-right">
                      <Badge variant={a.passed ? "green" : "red"}>
                        {a.passed ? "Passed" : "Failed"}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === "reviews" && (
          <div>
            <div className="divide-y divide-white/5">
              {student.reviews.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground/70">No reviews yet.</div>
              ) : (
                student.reviews.map((r) => (
                  <div key={r.id} className="px-4 py-4 hover:bg-secondary transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white text-sm font-medium">{r.course.title}</span>
                      <span className="text-muted-foreground/70 text-xs">{formatDate(r.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < r.rating ? "text-yellow-400 fill-yellow-400" : "text-white/20"
                          }`}
                        />
                      ))}
                      <span className="text-muted-foreground/70 text-xs ml-1">{r.rating}/5</span>
                    </div>
                    {r.comment && (
                      <p className="text-muted-foreground text-sm">{r.comment}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </GlassCard>

      {/* Notification Modal */}
      {showNotify && (
        <SendNotificationModal
          studentId={student.id}
          studentName={student.name}
          onClose={() => setShowNotify(false)}
        />
      )}
    </div>
  );
}
