/**
 * Course detail page — full redesign with hero, tabbed content, and sticky sidebar.
 * Server Component: fetches data, delegates interactivity to client components.
 */
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import CourseHero from "./CourseHero";
import CourseContent from "./CourseContent";
import CourseSidebar from "./CourseSidebar";
import CourseLayout from "./CourseLayout";
import PaymentStatus from "./PaymentStatus";

type Props = { params: Promise<{ id: string }> };

// Cache course data shared across all users (revalidates every 60s)
const getCourseById = unstable_cache(
  async (id: string) => {
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

    const avgRating =
      course.reviews.length > 0
        ? course.reviews.reduce((sum, r) => sum + r.rating, 0) / course.reviews.length
        : 0;

    return { course, avgRating };
  },
  ["course-detail"],
  { revalidate: 60, tags: ["course-detail"] }
);

// User-specific data — not cached
async function getUserCourseData(courseId: string, lessonIds: string[], userId?: string) {
  if (!userId) return { isEnrolled: false, completedLessonIds: [] as string[], isWishlisted: false };

  const [enrollment, completedRows, wishlisted] = await Promise.all([
    prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    }),
    prisma.lessonProgress.findMany({
      where: { userId, lessonId: { in: lessonIds }, completed: true },
      select: { lessonId: true },
    }),
    prisma.wishlist.findUnique({
      where: { userId_courseId: { userId, courseId } },
    }),
  ]);

  return {
    isEnrolled: Boolean(enrollment),
    completedLessonIds: completedRows.map((p) => p.lessonId),
    isWishlisted: Boolean(wishlisted),
  };
}

export default async function CourseDetailPage({ params }: Props) {
  const { id } = await params;

  // Cached course data (shared across users)
  const courseData = await getCourseById(id);
  if (!courseData) notFound();

  const { course, avgRating } = courseData;

  // User-specific data (parallel fetch, uncached)
  const session = await getSession();
  const { isEnrolled, completedLessonIds, isWishlisted } = await getUserCourseData(
    id,
    course.lessons.map((l: { id: string }) => l.id),
    session?.userId
  );

  const totalDuration = course.lessons.reduce((sum: number, l: { duration?: number | null }) => sum + (l.duration ?? 0), 0);

  const lessonsWithCompletion = course.lessons.map((l: (typeof course.lessons)[number]) => ({
    ...l,
    completed: completedLessonIds.includes(l.id),
  }));

  const priceNum = course.price ? Number(course.price) : null;
  const discountNum = course.discountPrice ? Number(course.discountPrice) : null;

  return (
    <div className="pb-10">
      <PaymentStatus />
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
