/**
 * /checkout/course/[courseId]?coupon=CODE
 * In-app course purchase — no redirect to Stripe.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StripeProvider } from "@/components/billing/StripeProvider";
import CourseCheckoutClient from "./CourseCheckoutClient";

interface PageProps {
  params:       Promise<{ courseId: string }>;
  searchParams: Promise<{ coupon?: string }>;
}

export default async function CourseCheckoutPage({ params, searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login?next=/courses");

  const { courseId } = await params;
  const { coupon }   = await searchParams;

  const course = await prisma.course.findUnique({
    where:  { id: courseId },
    select: {
      id:            true,
      title:         true,
      price:         true,
      discountPrice: true,
      isFree:        true,
      thumbnail:     true,
      createdBy:     { select: { name: true } },
      _count:        { select: { lessons: true } },
    },
  });

  if (!course)        redirect("/courses");
  if (course.isFree)  redirect(`/courses/${courseId}`);
  if (!course.price)  redirect(`/courses/${courseId}`);

  // Already enrolled?
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.userId, courseId } },
  });
  if (enrollment) redirect(`/courses/${courseId}?already_enrolled=1`);

  const price = course.discountPrice && Number(course.discountPrice) < Number(course.price)
    ? Number(course.discountPrice)
    : Number(course.price);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href="/" className="text-foreground font-bold text-lg tracking-tight">CoachNest</a>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Secured by Stripe
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-16">
        <StripeProvider>
          <CourseCheckoutClient
            courseId={courseId}
            courseName={course.title}
            instructorName={course.createdBy?.name ?? "Instructor"}
            lessonCount={course._count.lessons}
            thumbnail={course.thumbnail}
            price={price}
            originalPrice={Number(course.price)}
            initialCoupon={coupon}
          />
        </StripeProvider>
      </main>
    </div>
  );
}
