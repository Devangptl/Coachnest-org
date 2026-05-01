/**
 * Admin Enrollments Page — List all student enrollments
 */
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import { getEnrollmentsList, getEnrollmentStats } from "@/services/enrollment.service";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Users, GraduationCap, TrendingUp } from "lucide-react";
import EnrollmentFiltersBar from "./EnrollmentFiltersBar";
import EnrollmentTable from "./EnrollmentTable";

async function getInitialData() {
  const [enrollments, stats] = await Promise.all([
    getEnrollmentsList({}),
    getEnrollmentStats(),
  ]);
  return { enrollments, stats };
}

export default async function AdminEnrollmentsPage() {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  const { enrollments, stats } = await getInitialData();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Student Enrollments
        </h1>
        <p className="text-muted-foreground mt-1">
          Track student progress across courses and manage enrollments.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Total Enrollments", value: stats.totalEnrollments, icon: Users, color: "text-blue-400" },
          { label: "Active", value: stats.activeEnrollments, icon: TrendingUp, color: "text-emerald-400" },
          { label: "Completed", value: stats.completedEnrollments, icon: GraduationCap, color: "text-[#d97757]" },
          { label: "Inactive (30d+)", value: stats.droppedEnrollments, icon: Users, color: "text-amber-400" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={stat.label} className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center">
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-muted-foreground text-sm">{stat.label}</div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mb-8">
        <EnrollmentFiltersBar />
      </div>

      {/* Table */}
      <GlassCard padding="sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-foreground font-semibold">Enrollments</h2>
          <span className="text-muted-foreground/70 text-sm">{enrollments.length} total</span>
        </div>

        <EnrollmentTable enrollments={enrollments} />

        {enrollments.length === 0 && (
          <div className="text-center py-12 text-muted-foreground/70">
            <p className="mb-4">No enrollments found.</p>
            <Link href="/admin/courses" className="text-[#d97757] hover:text-orange-300">
              View Courses
            </Link>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
