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
import { getPlanAccess } from "@/services/subscription.service";
import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://coachnest.com";

type Props = { params: Promise<{ id: string }> };

// Cache course data shared across all users (revalidates every 60s)
const getCourseById = unstable_cache(
  async (id: string) => {
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        lessons: { orderBy: { order: "asc" } },
        createdBy: {
          select: {
            id:     true,
            name:   true,
            _count: { select: { followers: true } },
          },
        },
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
  lessonIds: string[],
  instructorId: string,
  userId?: string
) {
  const empty = {
    isEnrolled:              false,
    isRefunded:              false,
    completedLessonIds:      [] as string[],
    isWishlisted:            false,
    planAccess:              null as Awaited<ReturnType<typeof getPlanAccess>> | null,
    isFollowingInstructor:   false,
  };
  if (!userId) return empty;

  const [enrollment, completedRows, wishlisted, planAccess, refundedOrder, instructorFollow] =
    await Promise.all([
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
      prisma.order.findFirst({
        where:  { userId, courseId, status: "REFUNDED" },
        select: { id: true },
      }),
      prisma.userInstructorFollow.findUnique({
        where: { userId_instructorId: { userId, instructorId } },
        select: { id: true },
      }),
    ]);

  const isEnrolled = Boolean(enrollment);

  return {
    isEnrolled,
    isRefunded:            Boolean(refundedOrder),
    completedLessonIds:    completedRows.map((p) => p.lessonId),
    isWishlisted:          Boolean(wishlisted),
    planAccess,
    isFollowingInstructor: Boolean(instructorFollow),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getCourseById(id);
  if (!data) return { title: "Course Not Found" };

  const { course, avgRating } = data;
  const price = course.price ? Number(course.price) : null;
  const pageUrl = `${BASE_URL}/courses/${id}`;

  return {
    title: course.title,
    description: course.description?.slice(0, 160) ?? undefined,
    openGraph: {
      type: "website",
      url: pageUrl,
      title: course.title,
      description: course.description?.slice(0, 160) ?? undefined,
      images: course.thumbnail
        ? [{ url: course.thumbnail, alt: course.title }]
        : [{ url: `/api/og?title=${encodeURIComponent(course.title)}&type=course`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: course.title,
      description: course.description?.slice(0, 160) ?? undefined,
      images: course.thumbnail
        ? [course.thumbnail]
        : [`/api/og?title=${encodeURIComponent(course.title)}&type=course`],
    },
    alternates: { canonical: pageUrl },
    other: {
      "course:rating": String(avgRating.toFixed(1)),
      ...(price ? { "course:price": String(price) } : {}),
    },
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
    isEnrolled, isRefunded, completedLessonIds, isWishlisted, planAccess,
    isFollowingInstructor,
  } = await getUserCourseData(
    id,
    course.lessons.map((l: { id: string }) => l.id),
    course.createdBy.id,
    session?.userId
  );

  // Admins and instructors always have full content access.
  // For students: check if enrolled.
  const hasContentAccess =
    isEnrolled || session?.role === "ADMIN" || session?.role === "INSTRUCTOR";

  const totalDuration = course.lessons.reduce((sum: number, l: { duration?: number | null }) => sum + (l.duration ?? 0), 0);

  const lessonsWithCompletion = course.lessons.map((l: (typeof course.lessons)[number]) => ({
    ...l,
    completed: completedLessonIds.includes(l.id),
  }));

  // First incomplete lesson (or first lesson) for the "Continue Learning" link
  const nextLesson =
    lessonsWithCompletion.find((l) => !l.completed) ?? lessonsWithCompletion[0];
  const firstLessonId = nextLesson?.id;
  const nextLessonTitle = nextLesson?.title;
  const completedCount = completedLessonIds.length;

  const priceNum = course.price ? Number(course.price) : null;
  const discountNum = course.discountPrice ? Number(course.discountPrice) : null;

  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description ?? undefined,
    url: `${BASE_URL}/courses/${id}`,
    image: course.thumbnail ?? undefined,
    provider: {
      "@type": "Organization",
      name: "CoachNest",
      sameAs: BASE_URL,
    },
    instructor: {
      "@type": "Person",
      name: course.createdBy.name,
    },
    ...(course.category ? { about: { "@type": "Thing", name: course.category.name } } : {}),
    ...(avgRating > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: avgRating.toFixed(1),
            reviewCount: course._count.reviews,
            bestRating: "5",
            worstRating: "1",
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      price: course.isFree ? "0" : (course.discountPrice ?? course.price ?? "0"),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${BASE_URL}/courses/${id}`,
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Online",
      courseWorkload: `PT${Math.round(totalDuration / 60)}H`,
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home",    item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Courses", item: `${BASE_URL}/courses` },
      { "@type": "ListItem", position: 3, name: course.title, item: `${BASE_URL}/courses/${id}` },
    ],
  };

  return (
    <div className="pb-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <PaymentStatus />
      {/* ── Hero section ───────────────────────────────────── */}
      <CourseHero
        title={course.title}
        description={course.description}
        level={course.level}
        language={course.language}
        categoryName={course.category?.name ?? null}
        instructorName={course.createdBy.name}
        instructorId={course.createdBy.id}
        lessonCount={course.lessons.length}
        totalDuration={totalDuration}
        enrollmentCount={course._count.enrollments}
        reviewCount={course._count.reviews}
        avgRating={avgRating}
        isFree={course.isFree}
        isFollowingInstructor={isFollowingInstructor}
        instructorFollowerCount={course.createdBy._count.followers}
        isLoggedIn={Boolean(session)}
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
            isEnrolled={isEnrolled}
            isRefunded={isRefunded}
            isWishlisted={isWishlisted}
            isLoggedIn={Boolean(session)}
            userRole={session?.role ?? null}
            lessonCount={course.lessons.length}
            totalDuration={totalDuration}
            language={course.language}
            level={course.level}
            firstLessonId={firstLessonId}
            completedCount={completedCount}
            nextLessonTitle={nextLessonTitle}
            thumbnail={course.thumbnail}
            title={course.title}
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
