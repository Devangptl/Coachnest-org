/**
 * Lesson detail page — prerendered at build time for every course lesson.
 *
 * Only course/lesson data (public, same for all users) is fetched here.
 * User-specific state (enrollment, progress) is loaded client-side via
 * GET /api/me/course-access/[courseId] so the static shell can be served
 * instantly from the CDN.
 */
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import LessonPageClient from "./LessonPageClient";

type Props = { params: Promise<{ id: string; lessonId: string }> };

// ── Cache course + lessons (shared across all users) ─────────────────────────

const getCourseWithLessons = unstable_cache(
  async (courseId: string) => {
    return prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        status: true,
        lessons: {
          orderBy: { order: "asc" },
          select: { id: true, title: true, type: true, content: true, duration: true, isFree: true },
        },
      },
    });
  },
  ["course-lessons"],
  { revalidate: 300, tags: ["course-lessons"] } // 5-minute ISR
);

// ── Static params — pre-render every lesson page at build time ───────────────
// Falls back to empty array if the database is unreachable during the build
// (e.g. network restrictions in CI). Pages are then generated on first request
// and cached via ISR, which still gives near-static performance.

export async function generateStaticParams() {
  try {
    const courses = await prisma.course.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: { id: true, lessons: { select: { id: true } } },
    });

    return courses.flatMap((c) =>
      c.lessons.map((l) => ({ id: c.id, lessonId: l.id }))
    );
  } catch {
    // DB not reachable at build time — ISR will cache pages on first request
    return [];
  }
}

// Revalidate the static page every 5 minutes
export const revalidate = 300;

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function LessonPage({ params }: Props) {
  const { id: courseId, lessonId } = await params;

  const course = await getCourseWithLessons(courseId);
  if (!course || course.status === "ARCHIVED") notFound();

  const lesson = course.lessons.find((l) => l.id === lessonId);
  if (!lesson) notFound();

  return (
    <LessonPageClient
      courseId={courseId}
      courseTitle={course.title}
      lessons={course.lessons}
      currentLessonId={lessonId}
    />
  );
}
