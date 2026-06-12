/**
 * Org admin → Courses. Lists every course in the organization with status
 * and quick links into the builder (org instructor portal).
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
  PENDING_REVIEW: "bg-amber-500/10 text-amber-500",
};

export default async function OrgAdminCoursesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrgRole(slug, ["ORG_ADMIN"]);

  const courses = await prisma.course.findMany({
    where: { organizationId: ctx.org.id },
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
          <h1 className="text-3xl font-bold text-foreground">Courses</h1>
          <p className="text-muted-foreground mt-1">All courses in your organization.</p>
        </div>
        <Link href={`/org/${slug}/instructor/courses/new`} className="btn-primary">
          <Plus className="w-4 h-4" /> New Course
        </Link>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {courses.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No courses yet. Create the first one for your team.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {courses.map((c) => (
              <div key={c.id} className="px-5 py-3.5 flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    by {c.createdBy.name} · {c._count.lessons} lessons · {c._count.enrollments} enrolled
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
    </div>
  );
}
