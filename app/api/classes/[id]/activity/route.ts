/**
 * GET /api/classes/:id/activity
 *
 * Lightweight unified timeline for the instructor Overview tab. Pulls the
 * 10 most recent items across enrollments, live sessions, announcements,
 * assignments, and discussions in one round trip.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { assertClassOwner } from "@/services/class.service";

export type ActivityKind =
  | "ENROLLMENT"
  | "LIVE_SESSION"
  | "ANNOUNCEMENT"
  | "ASSIGNMENT"
  | "DISCUSSION";

export type ActivityItem = {
  kind: ActivityKind;
  id: string;
  title: string;
  body?: string | null;
  at: string;
  actor?: { id: string; name: string; avatar: string | null } | null;
  href?: string;
};

const LIMIT = 5;

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await assertClassOwner(id, session.userId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [enrolls, sessions, announcements, assignments, discussions] =
    await Promise.all([
      prisma.classEnrollment.findMany({
        where: { classId: id, status: "APPROVED" },
        orderBy: { approvedAt: "desc" },
        take: LIMIT,
        include: { user: { select: { id: true, name: true, avatar: true } } },
      }),
      prisma.liveSession.findMany({
        where: { classId: id },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
      }),
      prisma.announcement.findMany({
        where: { classId: id },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        include: { author: { select: { id: true, name: true, avatar: true } } },
      }),
      prisma.assignment.findMany({
        where: { classId: id },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
      }),
      prisma.discussion.findMany({
        where: { classId: id, parentId: null },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        include: { author: { select: { id: true, name: true, avatar: true } } },
      }),
    ]);

  const items: ActivityItem[] = [];

  for (const e of enrolls) {
    items.push({
      kind: "ENROLLMENT",
      id: e.id,
      title: `${e.user.name} joined the class`,
      at: (e.approvedAt ?? e.requestedAt).toISOString(),
      actor: e.user,
    });
  }
  for (const s of sessions) {
    items.push({
      kind: "LIVE_SESSION",
      id: s.id,
      title: `Scheduled "${s.title}"`,
      body: new Date(s.scheduledAt).toLocaleString(),
      at: s.createdAt.toISOString(),
    });
  }
  for (const a of announcements) {
    items.push({
      kind: "ANNOUNCEMENT",
      id: a.id,
      title: a.title,
      body: a.body.slice(0, 140),
      at: a.createdAt.toISOString(),
      actor: a.author,
    });
  }
  for (const a of assignments) {
    items.push({
      kind: "ASSIGNMENT",
      id: a.id,
      title: `${a.status === "PUBLISHED" ? "Published" : "Drafted"} "${a.title}"`,
      at: a.createdAt.toISOString(),
    });
  }
  for (const d of discussions) {
    items.push({
      kind: "DISCUSSION",
      id: d.id,
      title: d.title,
      body: d.body.slice(0, 140),
      at: d.createdAt.toISOString(),
      actor: d.author,
    });
  }

  items.sort((a, b) => +new Date(b.at) - +new Date(a.at));

  return NextResponse.json({ items: items.slice(0, 12) });
}
