/**
 * Course catalog page — curated course lists + all published courses,
 * with on-page search (matches title, description and instructor name).
 */
import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen, ListVideo, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { playlistDurations } from "@/services/playlist.service";
import PlaylistCard from "@/components/playlists/PlaylistCard";
import CoursesBrowser, { type CourseVM } from "./CoursesBrowser";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://coachnest.com";

export const metadata: Metadata = {
  title: "Browse Courses — Learn Programming, Design & More",
  description:
    "Explore our full catalog of expert-crafted online courses and curated learning paths in web development, design, AI, data science, and more.",
  keywords: [
    "online courses", "programming courses", "web development", "design courses",
    "learn to code", "AI courses", "data science", "free online courses",
    "course playlists", "learning paths",
  ],
  alternates: { canonical: `${BASE_URL}/courses` },
  openGraph: {
    type: "website",
    url: `${BASE_URL}/courses`,
    title: "Browse Courses — Learn Programming, Design & More",
    description:
      "Explore expert-crafted courses and curated learning paths. Start learning free today.",
  },
};

async function getCourses() {
  return prisma.course.findMany({
    where: { status: "PUBLISHED" },
    include: {
      createdBy: { select: { id: true, name: true, avatar: true } },
      category: { select: { name: true, slug: true } },
      _count: { select: { lessons: true, enrollments: true } },
      reviews: { select: { rating: true } },
    },
    orderBy: { enrollments: { _count: "desc" } },
  });
}

/** Public playlists for the curated section. Resilient if the tables
 *  don't exist yet (e.g. migrations not applied) — never breaks /courses. */
async function getPlaylists() {
  try {
    const playlists = await prisma.coursePlaylist.findMany({
      where: { visibility: "PUBLIC" },
      include: {
        owner: { select: { name: true } },
        _count: { select: { items: true, followers: true } },
      },
      orderBy: [{ followers: { _count: "desc" } }, { createdAt: "desc" }],
      take: 8,
    });
    const durations = await playlistDurations(playlists.map((p) => p.id));
    return playlists.map((p) => ({
      ...p,
      totalDuration: durations.get(p.id) ?? 0,
    }));
  } catch {
    return [];
  }
}

export default async function CoursesPage() {
  const [courses, playlists] = await Promise.all([
    getCourses(),
    getPlaylists(),
  ]);

  const courseVMs: CourseVM[] = courses.map((course) => ({
    id: course.id,
    title: course.title,
    description: course.description,
    thumbnail: course.thumbnail,
    instructorName: course.createdBy.name,
    instructorId: course.createdBy.id,
    instructorAvatar: course.createdBy.avatar,
    price: course.price ? Number(course.price) : null,
    discountPrice: course.discountPrice ? Number(course.discountPrice) : null,
    isFree: course.isFree,
    level: course.level,
    totalLessons: course._count.lessons,
    enrollmentCount: course._count.enrollments,
    avgRating: course.reviews.length
      ? Number(
          (
            course.reviews.reduce((s, r) => s + r.rating, 0) /
            course.reviews.length
          ).toFixed(1),
        )
      : 0,
    reviewCount: course.reviews.length,
    categoryName: course.category?.name ?? null,
  }));

  return (
    <div className="pt-6 pb-16">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
          Browse Courses
        </h1>
        <p className="text-muted-foreground text-sm">
          {courses.length} course{courses.length !== 1 ? "s" : ""} ·{" "}
          {playlists.length} curated list{playlists.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Curated course lists */}
      {playlists.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ListVideo className="w-5 h-5 text-orange-500" />
              Curated Course Lists
            </h2>
            <Link
              href="/playlists"
              className="text-xs font-medium text-orange-500 hover:text-orange-400 inline-flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {playlists.map((p) => (
              <PlaylistCard
                key={p.id}
                href={`/playlists/${p.slug}`}
                playlist={p}
                compact
              />
            ))}
          </div>
        </section>
      )}

      {/* Searchable course grid */}
      <section>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <BookOpen className="w-5 h-5 text-orange-500" />
          All Courses
        </h2>
        <CoursesBrowser courses={courseVMs} />
      </section>
    </div>
  );
}
