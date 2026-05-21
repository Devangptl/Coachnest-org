import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Globe,
  BookOpen,
  Users,
  Star,
  ListVideo,
  BadgeCheck,
  ArrowLeft,
  UserPlus,
} from "lucide-react";
import { getInstructorPublicProfile } from "@/services/instructor.service";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import InstructorAvatar from "@/components/InstructorAvatar";
import FollowInstructorButton from "@/components/FollowInstructorButton";
import ShareCourseModal from "@/components/ShareCourseModal";
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

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Website";
  }
}

function StatTile({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof BookOpen;
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4 flex items-center gap-3.5">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0">
        <div className="text-foreground font-semibold text-xl leading-none tabular-nums">
          {value}
        </div>
        <div className="text-muted-foreground text-xs mt-1.5">{label}</div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  count,
}: {
  icon: typeof BookOpen;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <Icon className="w-5 h-5 text-primary" />
        {title}
      </h2>
      {count != null && (
        <span className="text-xs font-medium text-muted-foreground bg-secondary border border-border rounded-full px-2.5 py-1 tabular-nums">
          {count} total
        </span>
      )}
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
    <div className="pt-5 pb-16 animate-fade-in">
      {/* Back link */}
      <Link
        href="/courses"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Browse courses
      </Link>

      {/* ── Profile header ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Banner */}
        <div className="h-28 sm:h-40 bg-gradient-to-r from-primary/15 via-amber-400/10 to-primary/15 border-b border-border" />

        <div className="px-5 sm:px-8 pb-7">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-12 sm:-mt-14">
            <InstructorAvatar
              name={profile.name}
              avatar={profile.avatar}
              seed={profile.id}
              size="w-24 h-24 sm:w-28 sm:h-28"
              className="ring-4 ring-card bg-card flex-shrink-0"
            />

            <div className="flex-1 min-w-0 sm:pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {profile.name}
                </h1>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Instructor
                </span>
              </div>
              {profile.headline && (
                <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">
                  {profile.headline}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2.5 sm:pb-1 flex-wrap">
              <FollowInstructorButton
                instructorId={profile.id}
                initialIsFollowing={Boolean(followRecord)}
                initialCount={followerCount}
                isLoggedIn={Boolean(session)}
                showCount
              />
              <ShareCourseModal
                path={`/instructors/${profile.id}`}
                title={profile.name}
                thumbnail={profile.avatar}
                triggerClassName="!px-3 !py-1.5 !text-xs"
              />
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {hostLabel(profile.website)}
                </a>
              )}
            </div>
          </div>

          {profile.bio && (
            <div className="mt-7 pt-6 border-t border-border">
              <h2 className="text-sm font-semibold text-foreground mb-2">
                About
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line max-w-3xl">
                {profile.bio}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        <StatTile
          icon={BookOpen}
          value={stats.coursesCount}
          label={stats.coursesCount === 1 ? "Course" : "Courses"}
        />
        <StatTile
          icon={Users}
          value={stats.studentsCount.toLocaleString()}
          label="Students"
        />
        <StatTile
          icon={Star}
          value={stats.averageRating > 0 ? stats.averageRating : "—"}
          label={
            stats.reviewsCount > 0
              ? `Rating · ${stats.reviewsCount} review${stats.reviewsCount !== 1 ? "s" : ""}`
              : "No ratings yet"
          }
        />
        <StatTile
          icon={UserPlus}
          value={followerCount.toLocaleString()}
          label={followerCount === 1 ? "Follower" : "Followers"}
        />
      </div>

      {/* ── Courses ── */}
      <section className="mt-10">
        <SectionHeader
          icon={BookOpen}
          title="Courses"
          count={courses.length || undefined}
        />
        {courses.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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
                compact
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-secondary/30 py-16 text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-foreground font-medium text-sm">
              No published courses yet
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              {profile.name} hasn’t published any courses so far.
            </p>
          </div>
        )}
      </section>

      {/* ── Playlists ── */}
      {playlists.length > 0 && (
        <section className="mt-10">
          <SectionHeader
            icon={ListVideo}
            title="Playlists"
            count={playlists.length}
          />
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
