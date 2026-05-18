/**
 * Public course list detail — professional, shadow-free layout.
 */
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ListVideo,
  BookOpen,
  Clock,
  Bookmark,
  Lock,
  Globe,
  Pencil,
  ArrowLeft,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { playlistDurations } from "@/services/playlist.service";
import { formatMinutes } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import FollowPlaylistButton from "@/components/FollowPlaylistButton";
import SharePlaylistButton from "@/components/SharePlaylistButton";
import PlaylistItemsList from "@/components/playlists/PlaylistItemsList";
import InstructorHoverCard from "@/components/InstructorHoverCard";
import InstructorAvatar from "@/components/InstructorAvatar";

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="pt-5 pb-16">
      <Suspense fallback={<DetailSkeleton />}>
        <PlaylistDetail slug={slug} />
      </Suspense>
    </div>
  );
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

async function PlaylistDetail({ slug }: { slug: string }) {
  const session = await getSession();

  const playlist = await prisma.coursePlaylist.findUnique({
    where: { slug },
    include: {
      owner: { select: { id: true, name: true, avatar: true, headline: true } },
      _count: { select: { items: true, followers: true } },
    },
  });
  if (!playlist) notFound();

  const canManage =
    !!session &&
    (playlist.ownerId === session.userId || session.role === "ADMIN");

  if (playlist.visibility !== "PUBLIC" && !canManage) notFound();

  const isOwnerOrAdmin = canManage;
  const [durations, isFollowing] = await Promise.all([
    playlistDurations([playlist.id]),
    session
      ? prisma.coursePlaylistFollow
          .findUnique({
            where: {
              userId_playlistId: {
                userId: session.userId,
                playlistId: playlist.id,
              },
            },
          })
          .then(Boolean)
      : Promise.resolve(false),
  ]);
  const totalDuration = durations.get(playlist.id) ?? 0;
  const manageHref =
    session?.role === "ADMIN" && playlist.ownerId !== session.userId
      ? `/admin/playlists/${playlist.id}`
      : `/instructor/playlists/${playlist.id}`;

  const courseCount = playlist._count.items;

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        href="/playlists"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Browse playlists
      </Link>

      {/* ── Header card ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary to-amber-500" />
        <div className="p-5 sm:p-7 flex flex-col md:flex-row gap-6">
          {/* Cover */}
          <div className="relative w-full md:w-80 aspect-video rounded-xl overflow-hidden bg-secondary border border-border flex-shrink-0">
            {playlist.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={playlist.coverImage}
                alt={playlist.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-orange-600/10 to-amber-500/15 flex items-center justify-center">
                <ListVideo className="w-14 h-14 text-primary/40" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 h-full w-[34%] bg-black/55 backdrop-blur-sm flex flex-col items-center justify-center text-white">
              <ListVideo className="w-6 h-6 mb-1 opacity-80" />
              <span className="text-sm font-semibold">{courseCount}</span>
              <span className="text-[10px] uppercase tracking-wide opacity-70">
                course{courseCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                <ListVideo className="w-3.5 h-3.5" />
                Playlist
              </span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 border ${
                  playlist.visibility === "PRIVATE"
                    ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
                    : "text-muted-foreground bg-secondary border-border"
                }`}
              >
                {playlist.visibility === "PRIVATE" ? (
                  <>
                    <Lock className="w-3 h-3" /> Private
                  </>
                ) : (
                  <>
                    <Globe className="w-3 h-3" /> Public
                  </>
                )}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-2.5 leading-tight">
              {playlist.title}
            </h1>

            {/* Owner */}
            <div className="mt-3">
              <InstructorHoverCard
                instructorId={playlist.owner.id}
                instructorName={playlist.owner.name}
                avatarUrl={playlist.owner.avatar}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <InstructorAvatar
                  name={playlist.owner.name}
                  avatar={playlist.owner.avatar}
                  seed={playlist.owner.id}
                  size="w-6 h-6"
                />
                <span>
                  by{" "}
                  <span className="text-foreground font-medium">
                    {playlist.owner.name}
                  </span>
                </span>
              </InstructorHoverCard>
            </div>

            {playlist.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed mt-4 max-w-2xl">
                {playlist.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2.5 mt-auto pt-6">
              {!isOwnerOrAdmin && (
                <FollowPlaylistButton
                  playlistId={playlist.id}
                  initialIsFollowing={isFollowing}
                  initialCount={playlist._count.followers}
                  isLoggedIn={!!session}
                />
              )}
              <SharePlaylistButton slug={playlist.slug} />
              {isOwnerOrAdmin && (
                <Link
                  href={manageHref}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Manage
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
        <StatTile
          icon={BookOpen}
          value={courseCount}
          label={courseCount === 1 ? "Course" : "Courses"}
        />
        <StatTile
          icon={Clock}
          value={formatMinutes(totalDuration)}
          label="Total length"
        />
        <StatTile
          icon={Bookmark}
          value={playlist._count.followers.toLocaleString()}
          label={playlist._count.followers === 1 ? "Saved by" : "Saves"}
        />
      </div>

      {/* ── Courses ── */}
      <section className="mt-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <BookOpen className="w-5 h-5 text-primary" />
            Courses in this list
          </h2>
          {courseCount > 0 && (
            <span className="text-xs font-medium text-muted-foreground bg-secondary border border-border rounded-full px-2.5 py-1 tabular-nums">
              {courseCount} total
            </span>
          )}
        </div>
        <PlaylistItemsList playlistId={playlist.id} total={courseCount} />
      </section>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div>
      <Skeleton h="h-4" w="w-32" className="mb-4" />

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="h-1 bg-secondary" />
        <div className="p-5 sm:p-7 flex flex-col md:flex-row gap-6">
          <Skeleton className="w-full md:w-80 aspect-video rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton h="h-5" w="w-40" />
            <Skeleton h="h-8" w="w-2/3" />
            <Skeleton h="h-4" w="w-36" />
            <Skeleton h="h-3" w="w-full" />
            <Skeleton h="h-3" w="w-4/5" />
            <div className="flex gap-2.5 pt-4">
              <Skeleton h="h-8" w="w-28" />
              <Skeleton h="h-8" w="w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card px-4 py-4 flex items-center gap-3.5"
          >
            <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
            <div className="space-y-2">
              <Skeleton h="h-5" w="w-14" />
              <Skeleton h="h-3" w="w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="mt-10 space-y-2">
        <Skeleton h="h-6" w="w-52" className="mb-5" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} h="h-24" className="w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
