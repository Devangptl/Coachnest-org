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
import CourseEnrollBar from "./CourseEnrollBar";
import CourseLayout from "./CourseLayout";
import PaymentStatus from "./PaymentStatus";
import { getPlanAccess, planMeetsRequirement } from "@/services/subscription.service";

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
async function getUserCourseData(
  courseId: string,
  courseMinPlan: string,
  isFree: boolean,
  lessonIds: string[],
  userId?: string
) {
  const empty = {
    isEnrolled:                  false,
    canAccessViaSub:             false,
    subscriptionExpiredForCourse: false,
    completedLessonIds:          [] as string[],
    isWishlisted:                false,
    planAccess:                  null as Awaited<ReturnType<typeof getPlanAccess>> | null,
  };
  if (!userId) return empty;

  const [enrollment, completedRows, wishlisted, planAccess] = await Promise.all([
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
    getPlanAccess(userId),
  ]);

  // ── Determine effective enrollment ──────────────────────────────────────────
  //
  // Access rules:
  //   • Free course      → permanent access (no subscription needed)
  //   • Paid + Order     → permanent access (course was directly purchased)
  //   • Paid + sub only  → access is ACTIVE only while the subscription is active
  //                        (CANCELLED subscriptions within the billing period still count as active)
  //
  // This prevents subscription-enrolled courses from becoming permanently free
  // after the subscription expires — the Enrollment record stays in the DB but
  // access is gated on planAccess.isActive.

  let isEnrolled = false;
  let subscriptionExpiredForCourse = false;

  if (enrollment) {
    if (isFree) {
      // Free courses: permanent access once enrolled
      isEnrolled = true;
    } else {
      // Paid course: check whether this was a direct purchase or subscription enrollment
      const paidOrder = await prisma.order.findFirst({
        where:  { userId, courseId, status: "PAID" },
        select: { id: true },
      });

      if (paidOrder) {
        // Direct purchase → permanent access regardless of subscription
        isEnrolled = true;
      } else {
        // Subscription enrollment → access tied to subscription status
        if (planAccess.isActive) {
          isEnrolled = true;
        } else {
          // Subscription has expired — user had access but lost it
          isEnrolled = false;
          subscriptionExpiredForCourse = true;
        }
      }
    }
  }

  // ── Can enroll via active subscription (not yet enrolled) ──────────────────
  //
  // NOTE: We do NOT auto-enroll here. Viewing is free and must never consume
  // a subscription slot. A slot is consumed only when the user clicks "Access Now"
  // (POST /api/subscriptions/enroll).

  const meetsMinPlan = planMeetsRequirement(planAccess.plan, courseMinPlan);
  const canAccessViaSub =
    !isFree &&
    !isEnrolled &&                    // not already counted above
    planAccess.isActive &&
    planAccess.canAccessPaidCourses &&
    meetsMinPlan &&
    !planAccess.limitReached;

  return {
    isEnrolled,
    canAccessViaSub,
    subscriptionExpiredForCourse,
    completedLessonIds: completedRows.map((p) => p.lessonId),
    isWishlisted:       Boolean(wishlisted),
    planAccess,
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
  const {
    isEnrolled, canAccessViaSub, subscriptionExpiredForCourse,
    completedLessonIds, isWishlisted, planAccess,
  } = await getUserCourseData(
    id,
    course.minPlan,
    course.isFree,
    course.lessons.map((l: { id: string }) => l.id),
    session?.userId
  );

  // Admins and instructors always have full content access.
  // For students: enrolled (active sub or direct purchase) or can access via active sub.
  const hasContentAccess =
    isEnrolled || canAccessViaSub ||
    session?.role === "ADMIN" || session?.role === "INSTRUCTOR";

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
        isEnrolled={isEnrolled}
        enrollBar={
          <CourseEnrollBar
            courseId={course.id}
            price={priceNum}
            discountPrice={discountNum}
            isFree={course.isFree}
            courseMinPlan={course.minPlan}
            isEnrolled={isEnrolled}
            canAccessViaSub={canAccessViaSub}
            subscriptionExpiredForCourse={subscriptionExpiredForCourse}
            isWishlisted={isWishlisted}
            isLoggedIn={Boolean(session)}
            userRole={session?.role ?? null}
            planAccess={planAccess}
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
          isEnrolled={hasContentAccess}
          isLoggedIn={Boolean(session)}
          reviewCount={course._count.reviews}
        />
      </CourseLayout>
    </div>
  );
}
