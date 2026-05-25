/**
 * PATCH /api/classes/:id/assignments/:assignmentId/submissions/:submissionId
 *   • Instructor / assistant grades the submission (score + feedback)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { gradeSubmission } from "@/services/assignment.service";
import { gradeSubmissionSchema } from "@/lib/validation/assignment";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; assignmentId: string; submissionId: string }> },
) {
  const { submissionId } = await ctx.params;
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
    return NextResponse.json({ submission });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
