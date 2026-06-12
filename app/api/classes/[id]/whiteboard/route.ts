/**
 * GET /api/classes/[id]/whiteboard — resolve (creating if needed) the shared
 * whiteboard for a class. Any class member may open it; it is owned by the
 * class instructor and grants enrolled students EDITOR access by default.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateContextWhiteboard } from "@/services/whiteboard.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id: classId } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true, name: true, instructorId: true },
  });
  if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const isInstructor = cls.instructorId === session.userId;
  const isAdmin = session.role === "ADMIN";
  let isMember = isInstructor || isAdmin;

  if (!isMember) {
    const [assistant, enrollment] = await Promise.all([
      prisma.classAssistant.findUnique({
        where: { classId_userId: { classId, userId: session.userId } },
        select: { id: true },
      }),
      prisma.classEnrollment.findUnique({
        where: { classId_userId: { classId, userId: session.userId } },
        select: { status: true },
      }),
    ]);
    isMember = !!assistant || enrollment?.status === "APPROVED";
  }

  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const board = await getOrCreateContextWhiteboard({
    scope: "LIVE_CLASS",
    ownerId: cls.instructorId,
    classId,
    defaultRole: "EDITOR",
    title: `${cls.name} — Whiteboard`,
  });

  return NextResponse.json({ whiteboardId: board.id });
}
