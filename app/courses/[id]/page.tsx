/**
 * Course detail page — full redesign with hero, tabbed content, and sticky sidebar.
 * Server Component: fetches data, delegates interactivity to client components.
 */
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import CourseHero from "./CourseHero";
import CourseContent from "./CourseContent";
import CourseSidebar from "./CourseSidebar";
import CourseLayout from "./CourseLayout";

type Props = { params: Promise<{ id: string }> };

async function getCourseData(id: string, userId?: string) {
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      lessons: { orderBy: { order: "asc" } },
      createdBy: { select: { name: true } },
      category: { select: { name: true } },
      reviews: { select: { rating: true } },
      _count: { select: { enrollments: true, reviews: true } },
    },
  });

  if (!course || course.status === "ARCHIVED") return null;

  const enrollment = userId
    ? await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: id } },
      })
    : null;

  const completedLessonIds = userId
    ? (
        await prisma.lessonProgress.findMany({
          where: { userId, lessonId: { in: course.lessons.map((l) => l.id) }, completed: true },
          select: { lessonId: true },
        })
      ).map((p) => p.lessonId)
    : [];

  const wishlisted = userId
    ? await prisma.wishlist.findUnique({
        where: { userId_courseId: { userId, courseId: id } },
      })
    : null;

  const avgRating =
    course.reviews.length > 0
      ? course.reviews.reduce((sum, r) => sum + r.rating, 0) / course.reviews.length
      : 0;

  return {
    course,
    isEnrolled: Boolean(enrollment),
    completedLessonIds,
    avgRating,
    isWishlisted: Boolean(wishlisted),
  };
}

export default async function CourseDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();

  const data = await getCourseData(id, session?.userId);
  if (!data) notFound();

  const { course, isEnrolled, completedLessonIds, avgRating, isWishlisted } = data;

  const totalDuration = course.lessons.reduce((sum, l) => sum + (l.duration ?? 0), 0);

  const lessonsWithCompletion = course.lessons.map((l) => ({
    ...l,
    completed: completedLessonIds.includes(l.id),
  }));

  const priceNum = course.price ? Number(course.price) : null;
  const discountNum = course.discountPrice ? Number(course.discountPrice) : null;

  return (
    <div className="pb-10">
      {/* ── Hero section ───────────────────────────────────── */}
      <CourseHero
        title={course.title}
        description={course.description}
        thumbnail={course.thumbnail}
        level={course.level}
        language={course.language}
        categoryName={course.category?.name ?? null}
        instructorName={course.createdBy.name}
        lessonCount={course.lessons.length}
        totalDuration={totalDuration}
        enrollmentCount={course._count.enrollments}
        reviewCount={course._count.reviews}
        avgRating={avgRating}
        isFree={course.isFree}
      />

      {/* ── Main content: two-column layout with toggleable sidebar ── */}
      <CourseLayout
        isEnrolled={isEnrolled || session?.role === "ADMIN" || session?.role === "INSTRUCTOR"}
        sidebar={
          <CourseSidebar
            courseId={course.id}
            price={priceNum}
            discountPrice={discountNum}
            isFree={course.isFree}
            isEnrolled={isEnrolled}
            isWishlisted={isWishlisted}
            isLoggedIn={Boolean(session)}
            userRole={session?.role ?? null}
            lessonCount={course.lessons.length}
            totalDuration={totalDuration}
            language={course.language}
            level={course.level}
          />
        }
      >
        <CourseContent
          courseId={course.id}
          description={course.description}
          lessons={lessonsWithCompletion}
          isEnrolled={isEnrolled || session?.role === "ADMIN" || session?.role === "INSTRUCTOR"}
          isLoggedIn={Boolean(session)}
          reviewCount={course._count.reviews}
        />
      </CourseLayout>
    </div>
  );
}
