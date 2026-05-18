/**
 * Admin: all course lists across the platform.
 */
import Link from "next/link";
import { ListVideo, Globe, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { playlistDurations } from "@/services/playlist.service";
import { formatMinutes } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPlaylistsPage() {
  const playlists = await prisma.coursePlaylist.findMany({
    include: {
      owner: { select: { name: true, email: true } },
      _count: { select: { items: true, followers: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const durations = await playlistDurations(playlists.map((p) => p.id));

  return (
    <div className="px-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
        <ListVideo className="w-6 h-6 text-orange-500" /> Course Lists
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        All playlists created by instructors and admins. {playlists.length} total.
      </p>

      {playlists.length === 0 ? (
        <div className="glass p-12 rounded-xl text-center">
          <p className="text-muted-foreground">No course lists yet.</p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Owner</th>
                <th className="px-4 py-3 font-semibold">Visibility</th>
                <th className="px-4 py-3 font-semibold">Courses</th>
                <th className="px-4 py-3 font-semibold">Duration</th>
                <th className="px-4 py-3 font-semibold">Followers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {playlists.map((p) => (
                <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/playlists/${p.id}`}
                      className="font-medium hover:text-orange-500 transition-colors"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.owner.name}
                  </td>
                  <td className="px-4 py-3">
                    {p.visibility === "PUBLIC" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                        <Globe className="w-3 h-3" /> Public
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-400 text-xs">
                        <Lock className="w-3 h-3" /> Private
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{p._count.items}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatMinutes(durations.get(p.id) ?? 0)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {p._count.followers}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
