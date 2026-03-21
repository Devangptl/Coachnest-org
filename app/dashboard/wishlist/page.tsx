/**
 * /dashboard/wishlist — Student's saved courses.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CourseCard from "@/components/CourseCard";
import GlassCard from "@/components/GlassCard";
import { Heart } from "lucide-react";

async function getWishlist(userId: string) {
  const items = await prisma.wishlist.findMany({
    where: { userId },
    include: {
      course: {
        include: {
          createdBy: { select: { name: true } },
          _count:    { select: { enrollments: true, reviews: true } },
          reviews:   { select: { rating: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return items.map((i) => ({
    ...i.course,
    price:         i.course.price         ? Number(i.course.price)         : null,
    discountPrice: i.course.discountPrice ? Number(i.course.discountPrice) : null,
    avgRating: i.course.reviews.length
      ? Number((i.course.reviews.reduce((s, r) => s + r.rating, 0) / i.course.reviews.length).toFixed(1))
      : 0,
  }));
}

export default async function WishlistPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const courses = await getWishlist(session.userId);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">My Wishlist</h1>
        <p className="text-white/40 text-sm mt-1">
          {courses.length} saved course{courses.length !== 1 ? "s" : ""}
        </p>
      </div>

      {courses.length === 0 ? (
        <GlassCard className="text-center py-20">
          <Heart className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white font-semibold text-lg mb-2">Wishlist is empty</p>
          <p className="text-white/40 text-sm">
            Save courses you&apos;re interested in for later.
          </p>
          <a href="/courses" className="btn-primary inline-flex mt-6">
            Explore Courses
          </a>
        </GlassCard>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {courses.map((c) => (
            <CourseCard
              key={c.id}
              id={c.id}
              title={c.title}
              description={c.description}
              thumbnail={c.thumbnail}
              instructorName={c.createdBy.name}
              price={c.price}
              discountPrice={c.discountPrice}
              isFree={c.isFree}
              level={c.level}
              totalLessons={c.totalLessons}
              enrollmentCount={c._count.enrollments}
              avgRating={c.avgRating}
              reviewCount={c._count.reviews}
            />
          ))}
        </div>
      )}
    </div>
  );
}
