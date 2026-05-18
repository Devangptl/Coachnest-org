/**
 * Public course list detail — YouTube-style 2-column, professional,
 * shadow-free layout.
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

function StatChip({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof BookOpen;
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 px-2 py-2.5 text-center">
      <Icon className="w-4 h-4 text-primary mx-auto mb-1.5" />
      <div className="text-sm font-semibold text-foreground tabular-nums leading-none">
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
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

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ── Left: sticky info panel ── */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-20 rounded-xl border border-border bg-card overflow-hidden">
            {/* Cover */}
            <div className="relative aspect-video bg-secondary">
              {playlist.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={playlist.coverImage}
                  alt={playlist.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-orange-600/15 to-amber-500/20 flex items-center justify-center">
                  <ListVideo className="w-12 h-12 text-primary/40" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
              <span
                className={`absolute top-2.5 left-2.5 inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 backdrop-blur-sm border ${
                  isPrivate
                    ? "text-amber-300 bg-black/50 border-amber-400/30"
                    : "text-white bg-black/50 border-white/15"
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
              <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 bg-black/65 backdrop-blur-sm text-white text-[11px] font-semibold rounded px-2 py-0.5">
                <ListVideo className="w-3 h-3" />
                {courseCount} course{courseCount !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="p-4 sm:p-5">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                <ListVideo className="w-3 h-3" />
                Playlist
              </span>

              <h1 className="text-xl font-bold text-foreground mt-2.5 leading-snug">
                {playlist.title}
              </h1>

              {/* Owner */}
              <div className="mt-3 pb-3 border-b border-border">
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
                    size="w-7 h-7"
                  />
                  <span className="leading-tight">
                    <span className="block text-[10px] uppercase tracking-wide text-muted-foreground/70">
                      Curated by
                    </span>
                    <span className="text-foreground font-medium">
                      {playlist.owner.name}
                    </span>
                  </span>
                </InstructorHoverCard>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <StatChip
                  icon={BookOpen}
                  value={courseCount}
                  label={courseCount === 1 ? "Course" : "Courses"}
                />
                <StatChip
                  icon={Clock}
                  value={formatMinutes(totalDuration)}
                  label="Length"
                />
                <StatChip
                  icon={Bookmark}
                  value={playlist._count.followers.toLocaleString()}
                  label="Saves"
                />
              </div>

              {playlist.description && (
                <p className="text-xs text-muted-foreground leading-relaxed mt-4 whitespace-pre-wrap line-clamp-6">
                  {playlist.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-4">
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
        </aside>

        {/* ── Right: course list ── */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <BookOpen className="w-4 h-4 text-primary" />
              Courses in this list
            </h2>
            {courseCount > 0 && (
              <span className="text-[11px] font-medium text-muted-foreground bg-secondary border border-border rounded-full px-2 py-0.5 tabular-nums">
                {courseCount} total
              </span>
            )}
          </div>
          <PlaylistItemsList playlistId={playlist.id} total={courseCount} />
        </div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div>
      <Skeleton h="h-3.5" w="w-28" className="mb-3" />
      <div className="grid lg:grid-cols-3 gap-5">
        <aside className="lg:col-span-1">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Skeleton className="w-full aspect-video" />
            <div className="p-4 sm:p-5 space-y-3">
              <Skeleton h="h-4" w="w-20" />
              <Skeleton h="h-6" w="w-3/4" />
              <Skeleton h="h-9" w="w-40" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton h="h-16" className="rounded-lg" />
                <Skeleton h="h-16" className="rounded-lg" />
                <Skeleton h="h-16" className="rounded-lg" />
              </div>
              <Skeleton h="h-3" w="w-full" />
              <Skeleton h="h-3" w="w-2/3" />
              <div className="flex gap-2 pt-1">
                <Skeleton h="h-8" w="w-24" />
                <Skeleton h="h-8" w="w-20" />
              </div>
            </div>
          </div>
        </aside>
        <div className="lg:col-span-2 space-y-2">
          <Skeleton h="h-5" w="w-44" className="mb-3" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} h="h-24" className="w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
