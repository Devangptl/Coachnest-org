/**
 * Course catalog page — lists all published courses with categories.
 */
import { prisma } from "@/lib/prisma";
import CourseCard from "@/components/CourseCard";
import SearchBar from "@/components/SearchBar";
import GlassCard from "@/components/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://coachnest.com";

export const metadata: Metadata = {
  title: "Browse Courses — Learn Programming, Design & More",
  description:
    "Explore our full catalog of expert-crafted online courses in web development, design, AI, data science, and more. Free and paid courses available.",
  keywords: [
    "online courses", "programming courses", "web development", "design courses",
    "learn to code", "AI courses", "data science", "free online courses",
  ],
  alternates: { canonical: `${BASE_URL}/courses` },
  openGraph: {
    type: "website",
    url: `${BASE_URL}/courses`,
    title: "Browse Courses — Learn Programming, Design & More",
    description:
      "Explore expert-crafted courses in web development, design, AI, and more. Start learning free today.",
  },
};

async function getCourses() {
  return prisma.course.findMany({
    where: { status: "PUBLISHED" },
    include: {
      createdBy: { select: { name: true } },
      category:  { select: { name: true, slug: true } },
      _count:    { select: { lessons: true, enrollments: true } },
      reviews:   { select: { rating: true } },
    },
    orderBy: { enrollments: { _count: "desc" } },
  });
}

async function getCategories() {
  return prisma.category.findMany({
    include: { _count: { select: { courses: true } } },
    orderBy: { courses: { _count: "desc" } },
  });
}

export default async function CoursesPage() {
  const [courses, categories] = await Promise.all([getCourses(), getCategories()]);

  return (
    <div className="pt-6 pb-16">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">All Courses</h1>
            <p className="text-muted-foreground text-sm">
              {courses.length} course{courses.length !== 1 ? "s" : ""} available
            </p>
          </div>
          <SearchBar className="w-full sm:w-72" placeholder="Search courses..." />
        </div>
      </div>

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/search?category=${cat.slug}`}>
              <Badge variant="outline" className="cursor-pointer hover:bg-secondary transition-colors">
                {cat.icon && <span>{cat.icon}</span>} {cat.name} ({cat._count.courses})
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* Grid */}
      {courses.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {courses.map((course) => {
            const avg = course.reviews.length
              ? Number((course.reviews.reduce((s, r) => s + r.rating, 0) / course.reviews.length).toFixed(1))
              : 0;
            return (
              <CourseCard
                key={course.id}
                id={course.id}
                title={course.title}
                description={course.description}
                thumbnail={course.thumbnail}
                instructorName={course.createdBy.name}
                price={course.price ? Number(course.price) : null}
                discountPrice={course.discountPrice ? Number(course.discountPrice) : null}
                isFree={course.isFree}
                level={course.level}
                totalLessons={course._count.lessons}
                enrollmentCount={course._count.enrollments}
                avgRating={avg}
                reviewCount={course.reviews.length}
                compact
              />
            );
          })}
        </div>
      ) : (
        <GlassCard className="text-center py-20">
          <BookOpen className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-white text-xl font-semibold mb-2">No courses yet</h3>
          <p className="text-muted-foreground">Check back soon — new courses are added regularly.</p>
        </GlassCard>
      )}
    </div>
  );
}
