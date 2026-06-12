/**
 * Org admin dashboard — headline stats + recent enrollments.
 */
import { Users, UserCog, BookOpen, GraduationCap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireOrgRole } from "@/lib/org-auth";
import { getOrgDashboardStats } from "@/services/org-analytics.service";

export const dynamic = "force-dynamic";

export default async function OrgAdminDashboard({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrgRole(slug, ["ORG_ADMIN"], { allowExpired: true });

  const [stats, recentEnrollments] = await Promise.all([
    getOrgDashboardStats(ctx.org.id),
    prisma.enrollment.findMany({
      where: { course: { organizationId: ctx.org.id } },
      include: {
        user: { select: { name: true, email: true } },
        course: { select: { title: true } },
      },
      orderBy: { enrolledAt: "desc" },
      take: 8,
    }),
  ]);

  const cards = [
    { label: "Students", value: stats.studentCount, icon: Users },
    { label: "Instructors", value: stats.instructorCount, icon: UserCog },
    { label: "Courses", value: stats.courseCount, icon: BookOpen },
    { label: "Enrollments", value: stats.enrollmentCount, icon: GraduationCap },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">{ctx.org.name}</h1>
        <p className="text-muted-foreground mt-1">Organization overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
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

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Recent enrollments</h2>
        </div>
        {recentEnrollments.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground text-center">
            No enrollments yet. Publish a course and invite students to get started.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {recentEnrollments.map((e) => (
              <div key={e.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{e.user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{e.course.title}</p>
                </div>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {e.enrolledAt.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
