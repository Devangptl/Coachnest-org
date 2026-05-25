/**
 * GET  /api/classes/:id/assignments  — list assignments
 *   • Instructor / assistant: sees all (incl. drafts) + submission counts
 *   • Member student: sees only PUBLISHED/CLOSED, with their own latest submission
 *
 * POST /api/classes/:id/assignments  — create (instructor / assistant only)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  createAssignment,
  listAssignmentsForInstructor,
  listAssignmentsForStudent,
} from "@/services/assignment.service";
import { createAssignmentSchema } from "@/lib/validation/assignment";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Determine whether the caller manages this class.
  const cls = await prisma.class.findUnique({
    where: { id },
    select: { instructorId: true },
  });
  if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = cls.instructorId === session.userId;
  const isAssistant = isOwner
    ? false
    : !!(await prisma.classAssistant.findUnique({
        where: { classId_userId: { classId: id, userId: session.userId } },
      }));

  try {
    if (isOwner || isAssistant) {
      const assignments = await listAssignmentsForInstructor(id, session.userId);
      return NextResponse.json({ assignments, role: "instructor" });
    }
    const assignments = await listAssignmentsForStudent(id, session.userId);
    return NextResponse.json({ assignments, role: "student" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createAssignmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const a = await createAssignment(id, session.userId, parsed.data);
    return NextResponse.json({ assignment: a }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
