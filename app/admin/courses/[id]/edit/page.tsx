/**
 * Admin → Edit Course page.
 * Renders the shared full-width CourseForm and the lessons manager.
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import CourseForm from "@/components/admin/CourseForm";
import LessonsManager from "./LessonsManager";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function getCourseData(id: string) {
  const [course, categories, tagSuggestions] = await Promise.all([
    prisma.course.findUnique({
      where: { id },
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

  return { course, categories, tagSuggestions };
}

export default async function EditCoursePage({ params }: Props) {
  const { id } = await params;
  const { course, categories, tagSuggestions } = await getCourseData(id);
  if (!course) notFound();

  const tagNames = course.tags.map((ct) => ct.tag.name);

  return (
    <div>
      <Link
        href="/admin/courses"
        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Courses
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Edit Course</h1>
        <p className="text-muted-foreground/70 text-sm mt-1">{course.title}</p>
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
        onCancelHref="/admin/courses"
      />

      <div className="mt-10">
        <h2 className="text-xl font-semibold text-foreground mb-5">Course Content</h2>
        <LessonsManager
          courseId={course.id}
          sections={course.sections}
          ungroupedLessons={course.lessons}
        />
      </div>
    </div>
  );
}
