/**
 * Org instructor → Edit Course. Shared CourseForm + LessonsManager scoped to
 * org courses (ORG_ADMIN: any org course; ORG_INSTRUCTOR: own courses).
 * Content APIs (/api/sections, /api/lessons, reorder) authorize org editors
 * via authorizeCourseEdit.
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireOrgRole } from "@/lib/org-auth";
import CourseForm from "@/components/admin/CourseForm";
import LessonsManager from "@/app/admin/courses/[id]/edit/LessonsManager";

export const dynamic = "force-dynamic";

export default async function OrgEditCoursePage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const ctx = await requireOrgRole(slug, ["ORG_ADMIN", "ORG_INSTRUCTOR"]);

  const course = await prisma.course.findFirst({
    where: { id, organizationId: ctx.org.id },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
      },
      lessons: { where: { sectionId: null }, orderBy: { order: "asc" } },
      tags: { include: { tag: { select: { name: true } } } },
    },
  });
  if (!course) notFound();

  const canManage =
    ctx.isPlatformAdmin ||
    ctx.role === "ORG_ADMIN" ||
    course.createdById === ctx.session.userId;
  if (!canManage) notFound();

  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <Link
        href={`/org/${slug}/instructor/courses`}
        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Courses
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground truncate">{course.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">Edit course details and manage lessons.</p>
      </div>

      <CourseForm
        mode="edit"
        initial={{
          id: course.id,
          title: course.title,
          shortDesc: course.shortDesc,
          description: course.description,
          thumbnail: course.thumbnail,
          price: null,
          discountPrice: null,
          isFree: true,
          level: course.level,
          language: course.language,
          status: course.status,
          categoryId: course.categoryId,
          tagNames: course.tags.map((ct) => ct.tag.name),
        }}
        categories={categories}
        onCancelHref={`/org/${slug}/instructor/courses`}
        apiBasePath={`/api/org/${slug}/courses`}
        redirectAfterCreateBase={`/org/${slug}/instructor/courses`}
        canEditRevenuePercent={false}
        statusOptions={[
          { value: "DRAFT", label: "Draft" },
          { value: "PUBLISHED", label: "Published" },
          { value: "ARCHIVED", label: "Archived" },
        ]}
      />

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-foreground mb-5">Course Content</h2>
        <LessonsManager
          courseId={course.id}
          sections={course.sections}
          ungroupedLessons={course.lessons}
        />
      </div>
    </div>
  );
}
