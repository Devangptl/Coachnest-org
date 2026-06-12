/**
 * Org instructor → My Courses. ORG_ADMINs see all org courses here too,
 * since they can manage any of them.
 */
import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireOrgRole } from "@/lib/org-auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-green-500/10 text-green-500",
  DRAFT: "bg-secondary text-muted-foreground",
  ARCHIVED: "bg-red-500/10 text-red-400",
};

export default async function OrgInstructorCoursesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrgRole(slug, ["ORG_ADMIN", "ORG_INSTRUCTOR"]);

  const canSeeAll = ctx.isPlatformAdmin || ctx.role === "ORG_ADMIN";
  const courses = await prisma.course.findMany({
    where: {
      organizationId: ctx.org.id,
      ...(canSeeAll ? {} : { createdById: ctx.session.userId }),
    },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { lessons: true, enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Courses</h1>
          <p className="text-muted-foreground mt-1">Create and manage courses for {ctx.org.name}.</p>
        </div>
        <Link href={`/org/${slug}/instructor/courses/new`} className="btn-primary">
          <Plus className="w-4 h-4" /> New Course
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="bg-card border border-border rounded-xl px-5 py-14 text-center">
          <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No courses yet.</p>
          <Link href={`/org/${slug}/instructor/courses/new`} className="btn-primary inline-flex">
            <Plus className="w-4 h-4" /> Create your first course
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
          {courses.map((c) => (
            <div key={c.id} className="px-5 py-3.5 flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {canSeeAll ? `by ${c.createdBy.name} · ` : ""}
                  {c._count.lessons} lessons · {c._count.enrollments} enrolled
                </p>
              </div>
              <span
                className={cn(
                  "text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap",
                  STATUS_STYLES[c.status] ?? "bg-secondary text-muted-foreground",
                )}
              >
                {c.status.replace("_", " ")}
              </span>
              <Link
                href={`/org/${slug}/instructor/courses/${c.id}/edit`}
                className="text-xs text-orange-500 hover:text-[#d97757] font-medium whitespace-nowrap"
              >
                Manage
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
