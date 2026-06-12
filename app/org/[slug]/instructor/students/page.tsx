/**
 * Org instructor → Students. Enrollment progress for students in the
 * instructor's own org courses (ORG_ADMIN sees all org courses).
 */
import { prisma } from "@/lib/prisma";
import { requireOrgRole } from "@/lib/org-auth";

export const dynamic = "force-dynamic";

export default async function OrgInstructorStudentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrgRole(slug, ["ORG_ADMIN", "ORG_INSTRUCTOR"]);

  const canSeeAll = ctx.isPlatformAdmin || ctx.role === "ORG_ADMIN";
  const enrollments = await prisma.enrollment.findMany({
    where: {
      course: {
        organizationId: ctx.org.id,
        ...(canSeeAll ? {} : { createdById: ctx.session.userId }),
      },
    },
    include: {
      user: { select: { name: true, email: true } },
      course: { select: { title: true } },
    },
    orderBy: { enrolledAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Students</h1>
        <p className="text-muted-foreground mt-1">
          Who&apos;s enrolled in your courses.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {enrollments.length === 0 ? (
          <p className="px-5 py-10 text-sm text-muted-foreground text-center">
            No enrollments yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {enrollments.map((e) => (
              <div key={e.id} className="px-5 py-3 flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{e.user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{e.course.title}</p>
                </div>
                <div className="text-right whitespace-nowrap">
                  <p className="text-xs text-muted-foreground">
                    {e.completedAt
                      ? "Completed"
                      : `Enrolled ${e.enrolledAt.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
