/**
 * GET /api/classes/:id/live-sessions/calendar
 *
 * Returns an .ics feed of every live session in the class. Available to any
 * approved class member (or the instructor); browsers and calendar apps can
 * subscribe to this URL — every fetch returns fresh data.
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { assertIsMember } from "@/services/class.service";
import { buildICalendar, type ICalEvent } from "@/lib/ical";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  let cls;
  try {
    cls = await assertIsMember(id, session.userId);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  const sessions = await prisma.liveSession.findMany({
    where: { classId: id, status: { not: "CANCELLED" } },
    orderBy: { scheduledAt: "asc" },
  });

  const events: ICalEvent[] = sessions.map((s) => ({
    uid: `live-session-${s.id}@learnhub`,
    title: `[${cls.name}] ${s.title}`,
    description: s.description,
    url: s.meetingUrl,
    location: s.meetingUrl ?? undefined,
    start: s.scheduledAt,
    durationMinutes: s.duration,
    updatedAt: s.updatedAt,
    status:
      s.status === "CANCELLED"
        ? "CANCELLED"
        : s.status === "ENDED"
        ? "CONFIRMED"
        : "CONFIRMED",
  }));

  const body = buildICalendar({
    calName: `${cls.name} — Live Sessions`,
    events,
  });

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug(cls.name)}-live-sessions.ics"`,
      "Cache-Control": "private, no-cache",
    },
  });
}

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "class";
}
