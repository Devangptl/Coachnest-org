/**
 * PATCH /api/admin/instructor-approvals/[id]
 * Approve or reject an instructor application.
 * Body: { action: "approve" | "reject", reason?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import {
  sendInstructorApprovedEmail,
  sendInstructorRejectedEmail,
} from "@/lib/email";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  const { action, reason } = await req.json();

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'." }, { status: 400 });
  }

  const instructor = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, instructorStatus: true },
  });

  if (!instructor || instructor.role !== "INSTRUCTOR") {
    return NextResponse.json({ error: "Instructor not found." }, { status: 404 });
  }

  if (instructor.instructorStatus === "APPROVED" && action === "approve") {
    return NextResponse.json({ error: "Already approved." }, { status: 409 });
  }

  const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

  // ── 1. Update Supabase app_metadata ──────────────────────────────────────
  await supabaseAdmin.auth.admin.updateUserById(id, {
    app_metadata: { role: "INSTRUCTOR", instructorStatus: newStatus },
  });

  // ── 2. Update Prisma ──────────────────────────────────────────────────────
  await prisma.user.update({
    where: { id },
    data: {
      instructorStatus:       newStatus,
      instructorReviewedAt:   new Date(),
      instructorRejectReason: action === "reject" ? (reason ?? null) : null,
    },
  });

  // ── 3. In-app notification ────────────────────────────────────────────────
  await createNotification({
    data: {
      userId: id,
      title:  action === "approve" ? "Application Approved!" : "Application Update",
      body:   action === "approve"
        ? "Congratulations! Your instructor application has been approved. You can now access the instructor dashboard."
        : `Your instructor application was not approved.${reason ? ` Reason: ${reason}` : ""}`,
      type:   "SYSTEM",
      link:   action === "approve" ? "/instructor" : "/instructor/pending",
    },
  });

  // ── 4. Email notification ─────────────────────────────────────────────────
  if (action === "approve") {
    sendInstructorApprovedEmail(instructor.email, instructor.name).catch(console.error);
  } else {
    sendInstructorRejectedEmail(instructor.email, instructor.name, reason).catch(console.error);
  }

  return NextResponse.json({
    message: action === "approve" ? "Instructor approved." : "Instructor rejected.",
    status: newStatus,
  });
}
