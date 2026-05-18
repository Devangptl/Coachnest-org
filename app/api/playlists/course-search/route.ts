/**
 * GET /api/playlists/course-search — search/filter published courses to add
 * to a playlist. Query: q, level, categoryId, playlistId (exclude existing), page.
 * Owner/admin only (used by the playlist manager).
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const PER_PAGE = 12;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const level = url.searchParams.get("level")?.trim();
  const categoryId = url.searchParams.get("categoryId")?.trim();
  const playlistId = url.searchParams.get("playlistId")?.trim();
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));

  let excludeIds: string[] = [];
  if (playlistId) {
    const existing = await prisma.coursePlaylistItem.findMany({
      where: { playlistId },
      select: { courseId: true },
    });
    excludeIds = existing.map((e) => e.courseId);
  }

  const where: Prisma.CourseWhereInput = {
    status: "PUBLISHED",
    ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
    ...(level ? { level } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { shortDesc: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      select: {
        id: true,
        title: true,
        thumbnail: true,
        level: true,
        totalLessons: true,
        totalDuration: true,
        createdBy: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.course.count({ where }),
  ]);

  return NextResponse.json({
    courses,
    total,
    page,
    hasMore: page * PER_PAGE < total,
  });
}
