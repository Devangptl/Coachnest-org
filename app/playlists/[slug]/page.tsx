/**
 * Public course list detail — compact, professional, shadow-free layout.
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
    <div className="pt-4 pb-14">
      <Suspense fallback={<DetailSkeleton />}>
        <PlaylistDetail slug={slug} />
      </Suspense>
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
  const isPrivate = playlist.visibility === "PRIVATE";

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        href="/playlists"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Browse playlists
      </Link>

      {/* ── Compact header card ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-primary to-amber-500" />
        <div className="p-4 sm:p-5 flex gap-4 sm:gap-5">
          {/* Cover */}
          <div className="relative w-28 sm:w-48 aspect-video rounded-lg overflow-hidden bg-secondary border border-border flex-shrink-0">
            {playlist.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={playlist.coverImage}
                alt={playlist.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-orange-600/10 to-amber-500/15 flex items-center justify-center">
                <ListVideo className="w-9 h-9 text-primary/40" />
              </div>
            )}
            <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 bg-black/70 backdrop-blur-sm text-white text-[10px] font-semibold rounded px-1.5 py-0.5">
              <ListVideo className="w-3 h-3" />
              {courseCount}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                <ListVideo className="w-3 h-3" />
                Playlist
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 border ${
                  isPrivate
                    ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
                    : "text-muted-foreground bg-secondary border-border"
                }`}
              >
                {isPrivate ? (
                  <>
                    <Lock className="w-2.5 h-2.5" /> Private
                  </>
                ) : (
                  <>
                    <Globe className="w-2.5 h-2.5" /> Public
                  </>
                )}
              </span>
            </div>

            <h1 className="text-lg sm:text-2xl font-bold text-foreground mt-2 leading-tight line-clamp-2">
              {playlist.title}
            </h1>

            {/* Owner + inline meta */}
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
              <InstructorHoverCard
                instructorId={playlist.owner.id}
                instructorName={playlist.owner.name}
                avatarUrl={playlist.owner.avatar}
                className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <InstructorAvatar
                  name={playlist.owner.name}
                  avatar={playlist.owner.avatar}
                  seed={playlist.owner.id}
                  size="w-5 h-5"
                />
                <span className="text-foreground font-medium">
                  {playlist.owner.name}
                </span>
              </InstructorHoverCard>
              <span className="text-border">·</span>
              <span className="inline-flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                {courseCount} course{courseCount !== 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatMinutes(totalDuration)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Bookmark className="w-3.5 h-3.5" />
                {playlist._count.followers.toLocaleString()}
              </span>
            </div>

            {playlist.description && (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-2.5 line-clamp-2 max-w-2xl">
                {playlist.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-auto pt-4">
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

      {/* ── Courses ── */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BookOpen className="w-4 h-4 text-primary" />
            Courses in this list
          </h2>
          {courseCount > 0 && (
            <span className="text-[11px] font-medium text-muted-foreground bg-secondary border border-border rounded-full px-2 py-0.5 tabular-nums">
              {courseCount}
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
      <Skeleton h="h-3.5" w="w-28" className="mb-3" />

      {/* Header */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="h-0.5 bg-secondary" />
        <div className="p-4 sm:p-5 flex gap-4 sm:gap-5">
          <Skeleton className="w-28 sm:w-48 aspect-video rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2.5">
            <Skeleton h="h-4" w="w-32" />
            <Skeleton h="h-6" w="w-2/3" />
            <Skeleton h="h-3.5" w="w-48" />
            <Skeleton h="h-3" w="w-full" />
            <div className="flex gap-2 pt-2">
              <Skeleton h="h-8" w="w-24" />
              <Skeleton h="h-8" w="w-20" />
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="mt-6 space-y-2">
        <Skeleton h="h-5" w="w-44" className="mb-3" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} h="h-24" className="w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
