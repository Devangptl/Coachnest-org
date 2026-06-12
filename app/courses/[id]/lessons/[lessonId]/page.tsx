/**
 * Lesson content page — prerendered via generateStaticParams + 5-min ISR.
 * The sidebar is in the parent layout (persistent, never unmounts).
 * Only the lesson content area re-renders on lesson navigation.
 */
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { canViewOrgCourse } from "@/lib/org-auth";
import LessonContentClient from "./LessonContentClient";

type Props = { params: Promise<{ id: string; lessonId: string }> };

// ── Cached course+lesson data (same cache as layout) ─────────────────────────

const getCourseWithLessons = unstable_cache(
  async (courseId: string) => {
    return prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        status: true,
        organizationId: true,
        sections: {
          orderBy: { order: "asc" },
          select: { id: true, order: true },
        },
        lessons: {
          // Order by section.order first (nulls = ungrouped, sorted last),
          // then by lesson order within each section / the ungrouped group.
          orderBy: [{ section: { order: "asc" } }, { order: "asc" }],
          select: {
            id: true,
            title: true,
            type: true,
            content: true,
            duration: true,
            isFree: true,
            section: { select: { id: true, title: true, order: true } },
          },
        },
      },
    });
  },
  ["course-lessons-page"],
  { revalidate: 300, tags: ["course-lessons"] }
);

// ── Static params — pre-render every lesson at build time ─────────────────────

export async function generateStaticParams() {
  try {
    const courses = await prisma.course.findMany({
      // Org-course lessons render dynamically (membership check needs cookies)
      where: { status: { not: "ARCHIVED" }, organizationId: null },
      select: { id: true, lessons: { select: { id: true } } },
    });
    return courses.flatMap((c) => c.lessons.map((l) => ({ id: c.id, lessonId: l.id })));
  } catch {
    return []; // DB unreachable at build time — ISR handles first-request caching
  }
}

export const revalidate = 300;

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function LessonPage({ params }: Props) {
  const { id: courseId, lessonId } = await params;

  const course = await getCourseWithLessons(courseId);
  if (!course || course.status === "ARCHIVED") notFound();

  // Org courses are visible only to that org's members (platform ADMIN passes).
  if (!(await canViewOrgCourse(course.organizationId))) notFound();

  const lessonIndex = course.lessons.findIndex((l) => l.id === lessonId);
  if (lessonIndex === -1) notFound();

  const lesson = course.lessons[lessonIndex];
  const prev = course.lessons[lessonIndex - 1] ?? null;
  const next = course.lessons[lessonIndex + 1] ?? null;

  // Chapter context: find which numbered chapter this lesson belongs to
  const chapterIndex = lesson.section
    ? course.sections.findIndex((s) => s.id === lesson.section!.id) + 1
    : undefined;

  return (
    <LessonContentClient
      courseId={courseId}
      lesson={lesson}
      lessonIndex={lessonIndex}
      totalLessons={course.lessons.length}
      chapterTitle={lesson.section?.title}
      chapterIndex={chapterIndex}
      totalChapters={course.sections.length > 0 ? course.sections.length : undefined}
      prev={prev ? { id: prev.id, title: prev.title } : null}
      next={next ? { id: next.id, title: next.title } : null}
    />
  );
}
