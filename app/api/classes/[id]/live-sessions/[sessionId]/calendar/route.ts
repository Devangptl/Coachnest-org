/**
 * GET /api/classes/:id/live-sessions/:sessionId/calendar
 *
 * Single-event .ics download — used by the "Add to calendar" button so a
 * student can drop one session straight into their personal calendar.
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { assertIsMember } from "@/services/class.service";
import { buildICalendar } from "@/lib/ical";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; sessionId: string }> },
) {
  const { id, sessionId } = await ctx.params;
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

  const s = await prisma.liveSession.findFirst({
    where: { id: sessionId, classId: id },
  });
  if (!s) return new Response("Not found", { status: 404 });

  const body = buildICalendar({
    calName: `${cls.name} — ${s.title}`,
    events: [
      {
        uid: `live-session-${s.id}@learnhub`,
        title: `[${cls.name}] ${s.title}`,
        description: s.description,
        url: s.meetingUrl,
        location: s.meetingUrl ?? undefined,
        start: s.scheduledAt,
        durationMinutes: s.duration,
        updatedAt: s.updatedAt,
        status: s.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED",
      },
    ],
  });

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${s.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 60) || "session"}.ics"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
