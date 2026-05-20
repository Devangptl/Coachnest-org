import { Clock, CheckCircle2, XCircle, GraduationCap } from "lucide-react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GlassCard from "@/components/GlassCard";
import InstructorApprovalTable from "./InstructorApprovalTable";

export const dynamic = "force-dynamic";

export default async function InstructorApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const sp = await searchParams;
  const activeTab = (sp.status as "PENDING" | "APPROVED" | "REJECTED") ?? "PENDING";

  const [pendingCount, approvedCount, rejectedCount, applications] = await Promise.all([
    prisma.user.count({ where: { role: "INSTRUCTOR", instructorStatus: "PENDING" } }),
    prisma.user.count({ where: { role: "INSTRUCTOR", instructorStatus: "APPROVED" } }),
    prisma.user.count({ where: { role: "INSTRUCTOR", instructorStatus: "REJECTED" } }),
    prisma.user.findMany({
      where: { role: "INSTRUCTOR", instructorStatus: activeTab },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        headline: true,
        bio: true,
        instructorStatus: true,
        instructorAppliedAt: true,
        instructorReviewedAt: true,
        instructorRejectReason: true,
      },
      orderBy: { instructorAppliedAt: "desc" },
    }),
  ]);

  const tabs = [
    { key: "PENDING",  label: "Pending",  count: pendingCount,  icon: Clock,          color: "text-amber-400"  },
    { key: "APPROVED", label: "Approved", count: approvedCount, icon: CheckCircle2,   color: "text-emerald-400" },
    { key: "REJECTED", label: "Rejected", count: rejectedCount, icon: XCircle,        color: "text-red-400"    },
  ] as const;

  const rows = applications.map((a) => ({
    ...a,
    instructorStatus:     (a.instructorStatus ?? "PENDING") as "PENDING" | "APPROVED" | "REJECTED",
    instructorAppliedAt:  a.instructorAppliedAt?.toISOString()  ?? null,
    instructorReviewedAt: a.instructorReviewedAt?.toISOString() ?? null,
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Instructor Applications</h1>
        <p className="text-muted-foreground mt-1">
          Review and manage instructor registration requests.
        </p>
      </div>

      {/* Tab stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {tabs.map(({ key, label, count, icon: Icon, color }) => (
          <a key={key} href={`?status=${key}`}>
            <GlassCard className={`flex items-center gap-4 transition-all hover:ring-1 hover:ring-border ${
              activeTab === key ? "ring-1 ring-border/60" : ""
            }`}>
              <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center">
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">{count}</div>
                <div className="text-muted-foreground text-sm">{label}</div>
              </div>
            </GlassCard>
          </a>
        ))}
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <GlassCard className="text-center py-16">
          <GraduationCap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">
            No {activeTab.toLowerCase()} instructor applications.
          </p>
        </GlassCard>
      ) : (
        <GlassCard padding="sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-foreground font-semibold">
              {activeTab === "PENDING" ? "Pending Review" : activeTab === "APPROVED" ? "Approved Instructors" : "Rejected Applications"}
            </h2>
            <span className="text-muted-foreground/70 text-sm">{rows.length} total</span>
          </div>
          <InstructorApprovalTable applications={rows} />
        </GlassCard>
      )}
    </div>
  );
}
