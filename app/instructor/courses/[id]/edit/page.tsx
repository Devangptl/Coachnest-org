/**
 * Instructor → Edit Course.
 * Renders the shared full-width CourseForm and the lessons manager,
 * scoped to instructor-owned courses.
 */
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CourseForm from "@/components/admin/CourseForm";
import LessonsManager from "@/app/admin/courses/[id]/edit/LessonsManager";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function InstructorEditCoursePage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const [course, categories, tagSuggestions] = await Promise.all([
    prisma.course.findFirst({
      where: { id, createdById: session.userId },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: { lessons: { orderBy: { order: "asc" } } },
        },
        lessons: {
          where: { sectionId: null },
          orderBy: { order: "asc" },
        },
        tags: { include: { tag: { select: { name: true } } } },
      },
    }),
    prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.tag.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
      take: 30,
    }),
  ]);

  if (!course) notFound();

  const tagNames = course.tags.map((ct) => ct.tag.name);
  const isAdmin = session.role === "ADMIN";

  return (
    <div>
      <Link
        href="/instructor/courses"
        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Courses
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground truncate">{course.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Edit course details and manage lessons.
        </p>
      </div>

      <CourseForm
        mode="edit"
        initial={{
          id: course.id,
          title: course.title,
          shortDesc: course.shortDesc,
          description: course.description,
          thumbnail: course.thumbnail,
          price: course.price ? course.price.toString() : null,
          discountPrice: course.discountPrice ? course.discountPrice.toString() : null,
          isFree: course.isFree,
          level: course.level,
          language: course.language,
          status: course.status,
          categoryId: course.categoryId,
          instructorRevenuePercent: course.instructorRevenuePercent,
          tagNames,
        }}
        categories={categories}
        suggestedTags={tagSuggestions.map((t) => t.name)}
        onCancelHref="/instructor/courses"
        apiBasePath="/api/instructor/courses"
        redirectAfterCreateBase="/instructor/courses"
        canEditRevenuePercent={isAdmin}
        statusOptions={
          isAdmin
            ? [
                { value: "DRAFT", label: "Draft" },
                { value: "PUBLISHED", label: "Published" },
                { value: "PENDING_REVIEW", label: "Pending Review" },
                { value: "ARCHIVED", label: "Archived" },
              ]
            : [
                { value: "DRAFT", label: "Draft" },
                { value: "PUBLISHED", label: "Published" },
              ]
        }
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
