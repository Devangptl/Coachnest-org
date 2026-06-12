/**
 * Org instructor dashboard — my courses at a glance.
 */
import Link from "next/link";
import { BookOpen, GraduationCap, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireOrgRole } from "@/lib/org-auth";

export const dynamic = "force-dynamic";

export default async function OrgInstructorDashboard({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrgRole(slug, ["ORG_ADMIN", "ORG_INSTRUCTOR"]);

  const [courseCount, enrollmentCount, recent] = await Promise.all([
    prisma.course.count({
      where: { organizationId: ctx.org.id, createdById: ctx.session.userId },
    }),
    prisma.enrollment.count({
      where: { course: { organizationId: ctx.org.id, createdById: ctx.session.userId } },
    }),
    prisma.course.findMany({
      where: { organizationId: ctx.org.id, createdById: ctx.session.userId },
      include: { _count: { select: { lessons: true, enrollments: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome, {ctx.session.name}</h1>
          <p className="text-muted-foreground mt-1">Your teaching activity in {ctx.org.name}.</p>
        </div>
        <Link href={`/org/${slug}/instructor/courses/new`} className="btn-primary">
          <Plus className="w-4 h-4" /> New Course
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8 max-w-md">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-2">
            <BookOpen className="w-3.5 h-3.5" /> My courses
          </div>
          <p className="text-2xl font-bold text-foreground">{courseCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-2">
            <GraduationCap className="w-3.5 h-3.5" /> Enrollments
          </div>
          <p className="text-2xl font-bold text-foreground">{enrollmentCount}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Recently updated</h2>
        </div>
        {recent.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground text-center">
            You haven&apos;t created any courses yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {recent.map((c) => (
              <Link
                key={c.id}
                href={`/org/${slug}/instructor/courses/${c.id}/edit`}
                className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-secondary/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {c._count.lessons} lessons · {c._count.enrollments} enrolled · {c.status.replace("_", " ")}
                  </p>
                </div>
                <span className="text-xs text-orange-500 font-medium whitespace-nowrap">Manage</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
