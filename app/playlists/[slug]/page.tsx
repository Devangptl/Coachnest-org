/**
 * Public course list detail — YouTube-playlist style.
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
  Pencil,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { playlistDurations } from "@/services/playlist.service";
import { formatMinutes } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import FollowPlaylistButton from "@/components/FollowPlaylistButton";
import SharePlaylistButton from "@/components/SharePlaylistButton";
import PlaylistItemsList from "@/components/playlists/PlaylistItemsList";

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="px-4 py-6">
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

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Sidebar / hero */}
      <aside className="lg:col-span-1">
        <div className="glass rounded-xl overflow-hidden sticky top-20">
          <div className="relative h-40 bg-secondary">
            {playlist.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={playlist.coverImage}
                alt={playlist.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/25 via-orange-600/15 to-amber-500/20 flex items-center justify-center">
                <ListVideo className="w-14 h-14 text-orange-500/40" />
              </div>
            )}
          </div>
          <div className="p-5">
            <h1 className="text-xl font-bold leading-snug">{playlist.title}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              by {playlist.owner.name}
            </p>

            <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-orange-500" />
                {playlist._count.items} course
                {playlist._count.items !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                {formatMinutes(totalDuration)}
              </span>
              <span className="flex items-center gap-1">
                <Bookmark className="w-3.5 h-3.5 text-orange-500" />
                {playlist._count.followers} saved
              </span>
              {playlist.visibility === "PRIVATE" && (
                <span className="flex items-center gap-1 text-amber-400">
                  <Lock className="w-3.5 h-3.5" /> Private
                </span>
              )}
            </div>

            {playlist.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed mt-4">
                {playlist.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-5">
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-[#d97757]/50 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" /> Manage
                </Link>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Course list */}
      <div className="lg:col-span-2">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">
          Courses in this list
        </h2>
        <PlaylistItemsList
          playlistId={playlist.id}
          total={playlist._count.items}
        />
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid lg:grid-cols-3 gap-6 animate-pulse">
      <aside className="lg:col-span-1">
        <div className="glass rounded-xl overflow-hidden">
          <Skeleton className="w-full h-40" />
          <div className="p-5 space-y-3">
            <Skeleton h="h-6" w="w-2/3" />
            <Skeleton h="h-3" w="w-1/3" />
            <Skeleton h="h-3" className="w-full" />
            <Skeleton h="h-9" className="w-full rounded-lg" />
          </div>
        </div>
      </aside>
      <div className="lg:col-span-2 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} h="h-24" className="w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
