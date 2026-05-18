import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Globe, BookOpen, Users, Star, ListVideo } from "lucide-react";
import { getInstructorPublicProfile } from "@/services/instructor.service";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import InstructorAvatar from "@/components/InstructorAvatar";
import FollowInstructorButton from "@/components/FollowInstructorButton";
import CourseCard from "@/components/CourseCard";
import PlaylistCard from "@/components/playlists/PlaylistCard";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const profile = await getInstructorPublicProfile(id);
  if (!profile) return { title: "Instructor not found" };
  return {
    title: `${profile.name} — Instructor`,
    description:
      profile.headline ||
      profile.bio?.slice(0, 155) ||
      `Explore courses and learning paths by ${profile.name}.`,
  };
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof BookOpen;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-orange-500/80" />
      <span className="text-foreground font-semibold">{value}</span>
      <span className="text-muted-foreground text-sm">{label}</span>
    </div>
  );
}

export default async function InstructorPage({ params }: Params) {
  const { id } = await params;
  const profile = await getInstructorPublicProfile(id);
  if (!profile) notFound();

  const session = await getSession();
  const [followerCount, followRecord] = await Promise.all([
    prisma.userInstructorFollow.count({ where: { instructorId: id } }),
    session
      ? prisma.userInstructorFollow.findUnique({
          where: {
            userId_instructorId: { userId: session.userId, instructorId: id },
          },
          select: { id: true },
        })
      : null,
  ]);

  const { stats, courses, playlists } = profile;

  return (
    <div className="pt-6 pb-16">
      {/* ── Header ── */}
      <div className="bg-card border border-border/60 rounded-xl p-6 sm:p-8 mb-10 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <InstructorAvatar
            name={profile.name}
            avatar={profile.avatar}
            seed={profile.id}
            size="w-20 h-20"
            className="flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {profile.name}
            </h1>
            {profile.headline && (
              <p className="text-muted-foreground mt-1">{profile.headline}</p>
            )}

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4">
              <Stat
                icon={BookOpen}
                value={stats.coursesCount}
                label={stats.coursesCount === 1 ? "course" : "courses"}
              />
              <Stat
                icon={Users}
                value={stats.studentsCount.toLocaleString()}
                label="students"
              />
              {stats.averageRating > 0 && (
                <Stat
                  icon={Star}
                  value={stats.averageRating}
                  label={`(${stats.reviewsCount} review${stats.reviewsCount !== 1 ? "s" : ""})`}
                />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-5">
              <FollowInstructorButton
                instructorId={profile.id}
                initialIsFollowing={Boolean(followRecord)}
                initialCount={followerCount}
                isLoggedIn={Boolean(session)}
                showCount
              />
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-orange-500/50 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Website
                </a>
              )}
            </div>
          </div>
        </div>

        {profile.bio && (
          <p className="text-muted-foreground text-sm leading-relaxed mt-6 whitespace-pre-line border-t border-border/60 pt-5">
            {profile.bio}
          </p>
        )}
      </div>

      {/* ── Courses ── */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-orange-500" />
          Courses by {profile.name}
        </h2>
        {courses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {courses.map((c) => (
              <CourseCard
                key={c.id}
                id={c.id}
                title={c.title}
                description={c.description}
                thumbnail={c.thumbnail}
                instructorName={profile.name}
                instructorId={profile.id}
                instructorAvatar={profile.avatar}
                price={c.price}
                discountPrice={c.discountPrice}
                isFree={c.isFree}
                level={c.level}
                totalLessons={c.totalLessons}
                enrollmentCount={c.enrollmentCount}
                avgRating={c.avgRating}
                reviewCount={c.reviewCount}
              />
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border/60 rounded-xl py-14 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground/25 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No published courses yet.
            </p>
          </div>
        )}
      </section>

      {/* ── Playlists ── */}
      {playlists.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <ListVideo className="w-5 h-5 text-orange-500" />
            Playlists
          </h2>
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
    </div>
  );
}
