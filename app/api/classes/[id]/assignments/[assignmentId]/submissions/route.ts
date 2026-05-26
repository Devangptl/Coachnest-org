/**
 * GET  /api/classes/:id/assignments/:assignmentId/submissions
 *   • Instructor / assistant: all submissions for grading
 *
 * POST /api/classes/:id/assignments/:assignmentId/submissions
 *   • Student: create or update own submission (draft or finalized)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  listSubmissions,
  submitAssignment,
} from "@/services/assignment.service";
import { submitAssignmentSchema } from "@/lib/validation/assignment";
import { prisma } from "@/lib/prisma";
import { sendAssignmentSubmittedEmail } from "@/lib/email";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; assignmentId: string }> },
) {
  const { assignmentId } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const submissions = await listSubmissions(assignmentId, session.userId);
    return NextResponse.json({ submissions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; assignmentId: string }> },
) {
  const { id: classId, assignmentId } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = submitAssignmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const submission = await submitAssignment(
      assignmentId,
      session.userId,
      parsed.data,
    );

    // Notify instructor when a student finalises their submission (fire-and-forget)
    if (parsed.data.status === "SUBMITTED") {
      prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: {
          class: {
            include: {
              instructor: { select: { email: true, name: true } },
            },
          },
          author: { select: { name: true } },
        },
      }).then(async (assignment) => {
        if (!assignment?.class.instructor.email) return;
        const student = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { name: true },
        });
        sendAssignmentSubmittedEmail(
          assignment.class.instructor.email,
          assignment.class.instructor.name ?? "Instructor",
          student?.name ?? "A student",
          assignment.title,
          assignment.class.name,
          classId,
        ).catch(() => null);
      }).catch(() => null);
    }

    return NextResponse.json({ submission }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
