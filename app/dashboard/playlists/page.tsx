/**
 * /dashboard/playlists — course lists the student has saved/followed.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { playlistDurations } from "@/services/playlist.service";
import GlassCard from "@/components/GlassCard";
import PlaylistCard from "@/components/playlists/PlaylistCard";

export const dynamic = "force-dynamic";

export default async function SavedPlaylistsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const follows = await prisma.coursePlaylistFollow.findMany({
    where: { userId: session.userId },
    include: {
      playlist: {
        include: {
          owner: { select: { name: true } },
          _count: { select: { items: true, followers: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const playlists = follows.map((f) => f.playlist);
  const durations = await playlistDurations(playlists.map((p) => p.id));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Saved Lists</h1>
        <p className="text-muted-foreground/70 text-sm mt-1">
          {playlists.length} saved course list
          {playlists.length !== 1 ? "s" : ""}
        </p>
      </div>

      {playlists.length === 0 ? (
        <GlassCard className="text-center py-20">
          <Bookmark className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-foreground font-semibold text-lg mb-2">
            No saved lists yet
          </p>
          <p className="text-muted-foreground/70 text-sm">
            Follow curated course lists to keep them handy.
          </p>
          <Link href="/playlists" className="btn-primary inline-flex mt-6">
            Browse Course Lists
          </Link>
        </GlassCard>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((p) => (
            <PlaylistCard
              key={p.id}
              href={`/playlists/${p.slug}`}
              playlist={{ ...p, totalDuration: durations.get(p.id) ?? 0 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
