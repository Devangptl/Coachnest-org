/**
 * Persistent lesson layout — keeps the sidebar mounted across all lesson pages.
 * This prevents the sidebar from flashing/re-rendering on lesson navigation.
 */
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { LessonProvider } from "./LessonProvider";
import LessonSidebar from "./LessonSidebar";

const getCourseWithLessons = unstable_cache(
  async (courseId: string) => {
    return prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        status: true,
        sections: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            order: true,
            lessons: {
              orderBy: { order: "asc" },
              select: { id: true, title: true, type: true, duration: true, isFree: true },
            },
          },
        },
        lessons: {
          where: { sectionId: null },
          orderBy: { order: "asc" },
          select: { id: true, title: true, type: true, duration: true, isFree: true },
        },
      },
    });
  },
  ["course-lessons-layout"],
  { revalidate: 300, tags: ["course-lessons"] }
);

export default async function LessonLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = await params;

  const course = await getCourseWithLessons(courseId);
  if (!course || course.status === "ARCHIVED") notFound();

  return (
    <LessonProvider courseId={courseId}>
      {/* lg: sidebar + content side-by-side | mobile: content below fixed top bar */}
      <div className="flex min-h-screen bg-background">
        <LessonSidebar
          courseId={courseId}
          courseTitle={course.title}
          sections={course.sections}
          ungroupedLessons={course.lessons}
        />

        {/* Main content — offset on mobile to clear the fixed top bar (~52px) */}
        <main className="flex-1 min-w-0 pt-[52px] lg:pt-0">
          {children}
        </main>
      </div>
    </LessonProvider>
  );
}
