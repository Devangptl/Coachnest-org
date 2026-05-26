/**
 * GET   /api/classes/:id/enrollments      — list enrollments (instructor)
 * PATCH /api/classes/:id/enrollments      — approve/reject/ban/remove
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { assertClassOwner, decideEnrollment } from "@/services/class.service";
import { enrollmentDecisionSchema } from "@/lib/validation/class";
import {
  sendClassEnrollmentApprovedEmail,
  sendClassEnrollmentRejectedEmail,
} from "@/lib/email";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await assertClassOwner(id, session.userId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get("status") as
    | "PENDING" | "APPROVED" | "REJECTED" | "BANNED" | "WAITLISTED" | null;

  const enrollments = await prisma.classEnrollment.findMany({
    where: { classId: id, ...(status ? { status } : {}) },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
    },
    orderBy: { requestedAt: "desc" },
  });
  return NextResponse.json({ enrollments });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = enrollmentDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Fetch enrollment + user + class info before the decision (needed for email)
  const enrollmentBefore = await prisma.classEnrollment.findUnique({
    where: { id: parsed.data.enrollmentId },
    include: {
      user:  { select: { email: true, name: true } },
      class: { select: { name: true } },
    },
  });

  try {
    const result = await decideEnrollment(
      id,
      session.userId,
      parsed.data.enrollmentId,
      parsed.data.decision,
    );

    // Notify student of the decision (fire-and-forget)
    if (enrollmentBefore?.user.email) {
      const { email, name } = enrollmentBefore.user;
      const className = enrollmentBefore.class.name;
      if (parsed.data.decision === "APPROVE") {
        sendClassEnrollmentApprovedEmail(email, name ?? "Student", className, id).catch(() => null);
      } else if (parsed.data.decision === "REJECT") {
        sendClassEnrollmentRejectedEmail(email, name ?? "Student", className).catch(() => null);
      }
    }

    return NextResponse.json({ enrollment: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
