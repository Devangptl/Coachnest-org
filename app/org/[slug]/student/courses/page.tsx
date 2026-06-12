/**
 * Org student → Course Catalog. Published org courses with one-click free
 * enrollment (covered by the org subscription).
 */
import { prisma } from "@/lib/prisma";
import { requireOrgRole } from "@/lib/org-auth";
import OrgCatalogClient from "./OrgCatalogClient";

export const dynamic = "force-dynamic";

export default async function OrgStudentCatalogPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrgRole(slug, ["ORG_ADMIN", "ORG_INSTRUCTOR", "ORG_STUDENT"]);

  const [courses, enrollments] = await Promise.all([
    prisma.course.findMany({
      where: { organizationId: ctx.org.id, status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        shortDesc: true,
        thumbnail: true,
        level: true,
        createdBy: { select: { name: true } },
        _count: { select: { lessons: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.enrollment.findMany({
      where: { userId: ctx.session.userId, course: { organizationId: ctx.org.id } },
      select: { courseId: true },
    }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Course Catalog</h1>
        <p className="text-muted-foreground mt-1">
          All courses are included with {ctx.org.name}&apos;s subscription.
        </p>
      </div>
      <OrgCatalogClient
        slug={slug}
        courses={courses.map((c) => ({
          id: c.id,
          title: c.title,
          shortDesc: c.shortDesc,
          thumbnail: c.thumbnail,
          level: c.level,
          instructor: c.createdBy.name,
          lessons: c._count.lessons,
        }))}
        enrolledIds={enrollments.map((e) => e.courseId)}
      />
    </div>
  );
}
