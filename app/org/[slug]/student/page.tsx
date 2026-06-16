/**
 * Org student → My Learning. The student's enrollments in org courses,
 * linking into the shared course player.
 */
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireOrgPermission } from "@/lib/org-auth";

export const dynamic = "force-dynamic";

export default async function OrgStudentDashboard({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrgPermission(slug, "course:view");

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: ctx.session.userId, course: { organizationId: ctx.org.id } },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          shortDesc: true,
          thumbnail: true,
          _count: { select: { lessons: true } },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">My Learning</h1>
        <p className="text-muted-foreground mt-1">Your courses at {ctx.org.name}.</p>
      </div>

      {enrollments.length === 0 ? (
        <div className="bg-card border border-border rounded-xl px-5 py-14 text-center">
          <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            You haven&apos;t enrolled in any courses yet.
          </p>
          <Link href={`/org/${slug}/student/courses`} className="btn-primary inline-flex">
            Browse the catalog <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrollments.map((e) => (
            <Link
              key={e.id}
              href={`/courses/${e.course.id}`}
              className="bg-card border border-border rounded-xl overflow-hidden hover:border-orange-500/40 transition-colors group"
            >
              {e.course.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.course.thumbnail} alt="" className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-32 bg-secondary flex items-center justify-center">
                  <BookOpen className="w-7 h-7 text-muted-foreground/40" />
                </div>
              )}
              <div className="p-4">
                <p className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-orange-500 transition-colors">
                  {e.course.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {e.course._count.lessons} lessons
                  {e.completedAt ? " · Completed ✓" : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
