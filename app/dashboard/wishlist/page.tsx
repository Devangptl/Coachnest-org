/**
 * /dashboard/wishlist — Student's saved courses.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import GlassCard from "@/components/GlassCard";
import ShareCourseModal from "@/components/ShareCourseModal";
import { Heart, BookOpen, Users, Star } from "lucide-react";

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
        <h1 className="text-3xl font-bold text-foreground">My Wishlist</h1>
        <p className="text-muted-foreground/70 text-sm mt-1">
          {courses.length} saved course{courses.length !== 1 ? "s" : ""}
        </p>
      </div>

      {courses.length === 0 ? (
        <GlassCard className="text-center py-20">
          <Heart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-foreground font-semibold text-lg mb-2">Wishlist is empty</p>
          <p className="text-muted-foreground/70 text-sm">
            Save courses you&apos;re interested in for later.
          </p>
          <a href="/courses" className="btn-primary inline-flex mt-6">
            Explore Courses
          </a>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {courses.map((c) => (
            <div
              key={c.id}
              className="flex gap-4 p-4 bg-card border border-border rounded-lg hover:border-orange-500/30 hover:shadow-md hover:shadow-orange-500/5 transition-all group"
            >
              {/* Thumbnail */}
              <Link href={`/courses/${c.id}`} className="relative flex-shrink-0 w-36 h-24 rounded-md overflow-hidden bg-secondary">
                {c.thumbnail ? (
                  <Image
                    src={c.thumbnail}
                    alt={c.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-500/20 to-amber-500/10">
                    <BookOpen className="w-8 h-8 text-orange-500/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </Link>

              {/* Content */}
              <div className="flex-1 min-w-0 flex flex-col py-0.5">
                {/* Top row: title + share + price */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Link href={`/courses/${c.id}`}>
                      <h3 className="font-semibold text-foreground text-[15px] line-clamp-1 group-hover:text-orange-500 transition-colors leading-snug">
                        {c.title}
                      </h3>
                    </Link>
                    {c.createdBy.name && (
                      <p className="text-muted-foreground/55 text-xs mt-0.5">by {c.createdBy.name}</p>
                    )}
                  </div>

                  {/* Share + Price */}
                  <div className="flex items-center gap-2 shrink-0">
                    <ShareCourseModal courseId={c.id} title={c.title} thumbnail={c.thumbnail} iconOnly />
                    <div className="flex flex-col items-end">
                      {c.isFree ? (
                        <span className="text-emerald-500 font-bold text-sm">Free</span>
                      ) : c.discountPrice != null && c.price != null ? (
                        <>
                          <span className="text-foreground font-bold text-base leading-none">
                            ₹{c.discountPrice.toLocaleString("en-IN")}
                          </span>
                          <span className="text-muted-foreground/50 text-xs line-through mt-0.5">
                            ₹{c.price.toLocaleString("en-IN")}
                          </span>
                        </>
                      ) : c.price != null ? (
                        <span className="text-foreground font-bold text-base leading-none">
                          ₹{c.price.toLocaleString("en-IN")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-muted-foreground/65 text-xs leading-relaxed line-clamp-2 mt-1.5 flex-1">
                  {c.description}
                </p>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground/60">
                  {c.level && (
                    <span className={`capitalize px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      c.level === "beginner"     ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" :
                      c.level === "intermediate" ? "text-amber-500 bg-amber-500/10 border-amber-500/20" :
                                                   "text-rose-500 bg-rose-500/10 border-rose-500/20"
                    }`}>{c.level}</span>
                  )}
                  {c.avgRating > 0 && (
                    <span className="flex items-center gap-1 text-amber-500 font-medium">
                      <Star className="w-3 h-3 fill-current" />
                      {c.avgRating}
                      <span className="text-muted-foreground/40 font-normal">({c._count.reviews})</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {c.totalLessons} lesson{c.totalLessons !== 1 ? "s" : ""}
                  </span>
                  {c._count.enrollments > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {c._count.enrollments.toLocaleString()} enrolled
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
