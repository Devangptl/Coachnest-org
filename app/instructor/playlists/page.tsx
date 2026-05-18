/**
 * Instructor: Course Lists (playlists)
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ListVideo, PlusCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { playlistDurations } from "@/services/playlist.service";
import { Button } from "@/components/ui/Button";
import PlaylistCard from "@/components/playlists/PlaylistCard";

export const dynamic = "force-dynamic";

export default async function InstructorPlaylistsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "STUDENT") redirect("/dashboard");

  const playlists = await prisma.coursePlaylist.findMany({
    where: { ownerId: session.userId },
    include: {
      owner: { select: { name: true } },
      _count: { select: { items: true, followers: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  const durations = await playlistDurations(playlists.map((p) => p.id));

  return (
    <div className="px-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ListVideo className="w-6 h-6 text-orange-500" />
            Course Lists
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize your courses into playlists by topic, path, or skill level.
          </p>
        </div>
        <Link href="/instructor/playlists/new">
          <Button>
            <PlusCircle className="w-4 h-4" /> New List
          </Button>
        </Link>
      </div>

      {playlists.length === 0 ? (
        <div className="glass p-12 text-center rounded-xl">
          <ListVideo className="w-16 h-16 text-orange-500/30 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-1">No course lists yet</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first list to group related courses together.
          </p>
          <Link href="/instructor/playlists/new">
            <Button>
              <PlusCircle className="w-4 h-4" /> Create your first list
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((p) => (
            <PlaylistCard
              key={p.id}
              href={`/instructor/playlists/${p.id}`}
              playlist={{ ...p, totalDuration: durations.get(p.id) ?? 0 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
