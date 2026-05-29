/**
 * /checkout/course/[courseId]?coupon=CODE
 * In-app course checkout using Razorpay Custom Checkout.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
    <div className="pt-4 pb-16 max-w-5xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Checkout</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Review your order and complete payment to get instant access.
      </p>
      <CourseCheckoutClient
          courseId={courseId}
          courseName={course.title}
          instructorName={course.createdBy?.name ?? "Instructor"}
          lessonCount={course._count.lessons}
          thumbnail={course.thumbnail}
          price={price}
          originalPrice={Number(course.price)}
          initialCoupon={coupon}
          userEmail={session.email}
        />
    </div>
  );
}
