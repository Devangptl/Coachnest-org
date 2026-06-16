/**
 * Org admin → Reports. Headline stats, enrollment trend, per-course completion.
 */
import { Users, UserCog, BookOpen, GraduationCap, CheckCircle2 } from "lucide-react";
import { requireOrgPermission } from "@/lib/org-auth";
import {
  getOrgDashboardStats,
  getOrgCourseCompletion,
  getOrgEnrollmentTrends,
} from "@/services/org-analytics.service";
import OrgEnrollmentChart from "@/components/org/OrgEnrollmentChart";

export const dynamic = "force-dynamic";

export default async function OrgReportsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrgPermission(slug, "reports:view", { allowExpired: true });

  const [stats, completion, trends] = await Promise.all([
    getOrgDashboardStats(ctx.org.id),
    getOrgCourseCompletion(ctx.org.id),
    getOrgEnrollmentTrends(ctx.org.id),
  ]);

  const cards = [
    { label: "Students", value: stats.studentCount, icon: Users },
    { label: "Instructors", value: stats.instructorCount, icon: UserCog },
    { label: "Published courses", value: stats.publishedCourseCount, icon: BookOpen },
    { label: "Enrollments", value: stats.enrollmentCount, icon: GraduationCap },
    { label: "Completions", value: stats.completedEnrollments, icon: CheckCircle2 },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-1">Learning activity across your organization.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-2">
                <Icon className="w-3.5 h-3.5" /> {c.label}
              </div>
              <p className="text-2xl font-bold text-foreground">{c.value.toLocaleString()}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Enrollments (last 6 months)</h2>
        <OrgEnrollmentChart data={trends} />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Course completion</h2>
        </div>
        {completion.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground text-center">No courses yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {completion.map((c) => (
              <div key={c.courseId} className="px-5 py-3 flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.enrollments} enrolled · {c.completed} completed
                  </p>
                </div>
                <div className="flex items-center gap-3 w-40">
                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{ width: `${c.completionRate}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-foreground w-9 text-right">
                    {c.completionRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
