import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { assertClassOwner, markAttendance } from "@/services/class.service";
import { attendanceMarkSchema } from "@/lib/validation/class";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await assertClassOwner(id, session.userId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const where = sessionId
    ? { sessionId }
    : { session: { classId: id } };

  const records = await prisma.attendance.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      session: { select: { id: true, title: true, scheduledAt: true } },
    },
    orderBy: { joinedAt: "desc" },
  });
  return NextResponse.json({ records });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: _id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = attendanceMarkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await markAttendance(session.userId, parsed.data.sessionId, parsed.data.records);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
