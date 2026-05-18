/**
 * Course Playlist service layer.
 *
 * Pure functions over Prisma — no HTTP concerns. Authorization is enforced
 * here via `assertPlaylistManager` (owner or ADMIN) since playlists span roles.
 */
import "server-only";
import slugify from "slugify";
import { prisma } from "@/lib/prisma";
import type {
  CreatePlaylistInput,
  UpdatePlaylistInput,
} from "@/lib/validation/playlist";

type Actor = { userId: string; role: "STUDENT" | "INSTRUCTOR" | "ADMIN" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function uniqueSlug(title: string, ignoreId?: string): Promise<string> {
  const base =
    slugify(title, { lower: true, strict: true }).slice(0, 80) || "playlist";
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.coursePlaylist.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export async function assertPlaylistManager(playlistId: string, actor: Actor) {
  const playlist = await prisma.coursePlaylist.findUnique({
    where: { id: playlistId },
  });
  if (!playlist) throw new Error("Playlist not found");
  if (playlist.ownerId !== actor.userId && actor.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return playlist;
}

// ─── Playlist CRUD ────────────────────────────────────────────────────────────

export async function createPlaylist(
  ownerId: string,
  input: CreatePlaylistInput,
) {
  const slug = await uniqueSlug(input.title);

  // De-dupe incoming course ids while preserving order.
  const ids = [...new Set(input.courseIds)];

  return prisma.coursePlaylist.create({
    data: {
      title: input.title,
      slug,
      description: input.description ?? null,
      coverImage: input.coverImage ?? null,
      visibility: input.visibility,
      ownerId,
      items: {
        create: ids.map((courseId, i) => ({ courseId, order: i })),
      },
    },
    include: { items: true },
  });
}

export async function updatePlaylist(
  playlistId: string,
  actor: Actor,
  input: UpdatePlaylistInput,
) {
  const playlist = await assertPlaylistManager(playlistId, actor);

  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) data[k] = v;
  }
  if (input.title && input.title !== playlist.title) {
    data.slug = await uniqueSlug(input.title, playlistId);
  }

  return prisma.coursePlaylist.update({ where: { id: playlistId }, data });
}

export async function deletePlaylist(playlistId: string, actor: Actor) {
  await assertPlaylistManager(playlistId, actor);
  return prisma.coursePlaylist.delete({ where: { id: playlistId } });
}

// ─── Course management within a playlist ──────────────────────────────────────

export async function addCourseToPlaylist(
  playlistId: string,
  actor: Actor,
  courseId: string,
) {
  await assertPlaylistManager(playlistId, actor);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });
  if (!course) throw new Error("Course not found");

  const existing = await prisma.coursePlaylistItem.findUnique({
    where: { playlistId_courseId: { playlistId, courseId } },
  });
  if (existing) throw new Error("Course already in this list");

  const max = await prisma.coursePlaylistItem.aggregate({
    where: { playlistId },
    _max: { order: true },
  });

  const item = await prisma.coursePlaylistItem.create({
    data: { playlistId, courseId, order: (max._max.order ?? -1) + 1 },
  });
  await touch(playlistId);
  return item;
}

export async function removeCourseFromPlaylist(
  playlistId: string,
  itemId: string,
  actor: Actor,
) {
  await assertPlaylistManager(playlistId, actor);
  const item = await prisma.coursePlaylistItem.findUnique({
    where: { id: itemId },
  });
  if (!item || item.playlistId !== playlistId) {
    throw new Error("Item not found");
  }
  await prisma.coursePlaylistItem.delete({ where: { id: itemId } });
  await touch(playlistId);
}

export async function reorderPlaylistItems(
  playlistId: string,
  actor: Actor,
  items: Array<{ itemId: string; order: number }>,
) {
  await assertPlaylistManager(playlistId, actor);
  await prisma.$transaction([
    ...items.map((it) =>
      prisma.coursePlaylistItem.updateMany({
        where: { id: it.itemId, playlistId },
        data: { order: it.order },
      }),
    ),
    prisma.coursePlaylist.update({
      where: { id: playlistId },
      data: { updatedAt: new Date() },
    }),
  ]);
}

async function touch(playlistId: string) {
  await prisma.coursePlaylist.update({
    where: { id: playlistId },
    data: { updatedAt: new Date() },
  });
}

// ─── Follow / Save ────────────────────────────────────────────────────────────

export async function followPlaylist(userId: string, playlistId: string) {
  const playlist = await prisma.coursePlaylist.findUnique({
    where: { id: playlistId },
  });
  if (!playlist) throw new Error("Playlist not found");
  if (playlist.visibility !== "PUBLIC" && playlist.ownerId !== userId) {
    throw new Error("This list is private");
  }
  return prisma.coursePlaylistFollow.upsert({
    where: { userId_playlistId: { userId, playlistId } },
    update: {},
    create: { userId, playlistId },
  });
}

export async function unfollowPlaylist(userId: string, playlistId: string) {
  return prisma.coursePlaylistFollow
    .delete({ where: { userId_playlistId: { userId, playlistId } } })
    .catch(() => null);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * Total course duration (minutes) per playlist, computed in one query.
 * `_count.items` already gives the course count, so we only aggregate duration.
 */
export async function playlistDurations(
  playlistIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (playlistIds.length === 0) return map;
  const rows = await prisma.coursePlaylistItem.findMany({
    where: { playlistId: { in: playlistIds } },
    select: { playlistId: true, course: { select: { totalDuration: true } } },
  });
  for (const r of rows) {
    map.set(r.playlistId, (map.get(r.playlistId) ?? 0) + r.course.totalDuration);
  }
  return map;
}
