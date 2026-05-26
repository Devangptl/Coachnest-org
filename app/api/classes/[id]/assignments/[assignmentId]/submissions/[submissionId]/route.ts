/**
 * PATCH /api/classes/:id/assignments/:assignmentId/submissions/:submissionId
 *   • Instructor / assistant grades the submission (score + feedback)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { gradeSubmission } from "@/services/assignment.service";
import { gradeSubmissionSchema } from "@/lib/validation/assignment";
import { prisma } from "@/lib/prisma";
import { sendAssignmentGradedEmail } from "@/lib/email";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; assignmentId: string; submissionId: string }> },
) {
  const { id: classId, submissionId } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = gradeSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const submission = await gradeSubmission(submissionId, session.userId, parsed.data);

    // Notify student of their grade (fire-and-forget)
    prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        student: { select: { email: true, name: true } },
        assignment: { select: { title: true, maxScore: true, class: { select: { name: true } } } },
      },
    }).then((sub) => {
      if (sub?.student.email && sub.assignment) {
        sendAssignmentGradedEmail(
          sub.student.email,
          sub.student.name ?? "Student",
          sub.assignment.title,
          sub.assignment.class.name,
          submission.score ?? 0,
          sub.assignment.maxScore,
          submission.feedback ?? null,
          classId,
        ).catch(() => null);
      }
    }).catch(() => null);

    return NextResponse.json({ submission });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
