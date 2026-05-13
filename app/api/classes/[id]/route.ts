/**
 * GET    /api/classes/:id  — full class details
 * PATCH  /api/classes/:id  — update class (owner)
 * DELETE /api/classes/:id  — delete class (owner)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { deleteClass, updateClass } from "@/services/class.service";
import { updateClassSchema } from "@/lib/validation/class";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();

  const cls = await prisma.class.findUnique({
    where: { id },
    include: {
      instructor: { select: { id: true, name: true, avatar: true, headline: true } },
      courses: {
        orderBy: { order: "asc" },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              thumbnail: true,
              totalLessons: true,
              totalDuration: true,
            },
          },
        },
      },
      _count: {
        select: {
          enrollments: { where: { status: "APPROVED" } },
          liveSessions: true,
        },
      },
    },
  });

  if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Privacy gate
  const isOwner = session?.userId === cls.instructorId;
  const enrollment = session
    ? await prisma.classEnrollment.findUnique({
        where: { classId_userId: { classId: id, userId: session.userId } },
      })
    : null;

  if (cls.visibility === "PRIVATE" && !isOwner && enrollment?.status !== "APPROVED") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Strip invite code for non-owners
  const safe = { ...cls, inviteCode: isOwner ? cls.inviteCode : undefined };
  return NextResponse.json({ class: safe, enrollment });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = updateClassSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const cls = await updateClass(id, session.userId, parsed.data);
    return NextResponse.json({ class: cls });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    const status = msg === "Forbidden" ? 403 : msg === "Class not found" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await deleteClass(id, session.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    const status = msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
