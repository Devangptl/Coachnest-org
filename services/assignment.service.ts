/**
 * Assignment service layer.
 *
 * Pure functions over Prisma — HTTP/auth concerns live in route handlers.
 * Authorization helpers live in class.service.ts (assertClassOwner /
 * assertIsMember) and are re-used here.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { channels, events } from "@/lib/realtime/channels";
import { emit } from "@/lib/realtime/emit";
import { assertClassOwner, assertIsMember } from "@/services/class.service";
import type {
  CreateAssignmentInput,
  GradeSubmissionInput,
  SubmitAssignmentInput,
  UpdateAssignmentInput,
} from "@/lib/validation/assignment";

// ─── Assignment CRUD (instructor) ─────────────────────────────────────────────

export async function listAssignmentsForInstructor(
  classId: string,
  instructorId: string,
) {
  await assertClassOwner(classId, instructorId);
  return prisma.assignment.findMany({
    where: { classId },
    orderBy: [{ createdAt: "desc" }],
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      _count: { select: { submissions: true } },
    },
  });
}

export async function listAssignmentsForStudent(
  classId: string,
  studentId: string,
) {
  await assertIsMember(classId, studentId);
  const assignments = await prisma.assignment.findMany({
    where: { classId, status: { in: ["PUBLISHED", "CLOSED"] } },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      submissions: {
        where: { studentId },
        orderBy: { attempt: "desc" },
        take: 1,
        select: {
          id: true, status: true, score: true, submittedAt: true,
          attempt: true, isLate: true, gradedAt: true,
        },
      },
    },
  });
  // Hide assignments whose publishAt is still in the future.
  const now = new Date();
  return assignments.filter(
    (a) => !a.publishAt || a.publishAt <= now,
  );
}

export async function getAssignment(
  assignmentId: string,
  userId: string,
) {
  const a = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      class: { select: { id: true, name: true, slug: true, instructorId: true } },
    },
  });
  if (!a) throw new Error("Assignment not found");
  // Members or owner can read.
  await assertIsMember(a.classId, userId);
  return a;
}

export async function createAssignment(
  classId: string,
  instructorId: string,
  input: CreateAssignmentInput,
) {
  await assertClassOwner(classId, instructorId);
  if (input.passingScore > input.maxScore) {
    throw new Error("Passing score cannot exceed max score");
  }
  if (input.type === "QUIZ" && !input.quizId) {
    throw new Error("Quiz assignments require a quizId");
  }
  return prisma.assignment.create({
    data: {
      classId,
      authorId: instructorId,
      title: input.title,
      description: input.description ?? null,
      instructions: input.instructions ?? null,
      type: input.type,
      maxScore: input.maxScore,
      passingScore: input.passingScore,
      weight: input.weight,
      dueAt: input.dueAt ?? null,
      publishAt: input.publishAt ?? null,
      quizId: input.quizId ?? null,
      allowLate: input.allowLate,
      latePenalty: input.latePenalty,
      maxAttempts: input.maxAttempts,
      attachments: input.attachments,
    },
  });
}

export async function updateAssignment(
  assignmentId: string,
  instructorId: string,
  input: UpdateAssignmentInput,
) {
  const a = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (!a) throw new Error("Assignment not found");
  await assertClassOwner(a.classId, instructorId);

  if (
    input.passingScore !== undefined &&
    input.maxScore !== undefined &&
    input.passingScore > input.maxScore
  ) {
    throw new Error("Passing score cannot exceed max score");
  }

  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) data[k] = v;
  }

  const updated = await prisma.assignment.update({
    where: { id: assignmentId },
    data,
  });

  // If transitioning to PUBLISHED, notify the class channel.
  if (input.status === "PUBLISHED" && a.status !== "PUBLISHED") {
    await emit(channels.classAssignments(a.classId), events.classAssignmentPublished, {
      assignmentId: updated.id,
      title: updated.title,
    });
  }
  return updated;
}

export async function deleteAssignment(
  assignmentId: string,
  instructorId: string,
) {
  const a = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (!a) throw new Error("Assignment not found");
  await assertClassOwner(a.classId, instructorId);
  return prisma.assignment.delete({ where: { id: assignmentId } });
}

// ─── Submissions (student) ────────────────────────────────────────────────────

export async function listSubmissions(
  assignmentId: string,
  instructorId: string,
) {
  const a = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (!a) throw new Error("Assignment not found");
  await assertClassOwner(a.classId, instructorId);
  return prisma.assignmentSubmission.findMany({
    where: { assignmentId },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    include: {
      student: { select: { id: true, name: true, avatar: true, email: true } },
      grader: { select: { id: true, name: true } },
    },
  });
}

export async function getMySubmission(
  assignmentId: string,
  studentId: string,
) {
  const a = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (!a) throw new Error("Assignment not found");
  await assertIsMember(a.classId, studentId);
  return prisma.assignmentSubmission.findMany({
    where: { assignmentId, studentId },
    orderBy: { attempt: "desc" },
    include: { grader: { select: { id: true, name: true } } },
  });
}

export async function submitAssignment(
  assignmentId: string,
  studentId: string,
  input: SubmitAssignmentInput,
) {
  const a = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (!a) throw new Error("Assignment not found");
  await assertIsMember(a.classId, studentId);
  if (a.status !== "PUBLISHED") throw new Error("Assignment is not open for submissions");

  const now = new Date();
  const isLate = !!(a.dueAt && now > a.dueAt);
  if (isLate && !a.allowLate) {
    throw new Error("Late submissions are not allowed");
  }

  const existing = await prisma.assignmentSubmission.findMany({
    where: { assignmentId, studentId },
    orderBy: { attempt: "desc" },
  });

  // Reuse the latest draft / returned submission as the working slot.
  const reusable = existing.find(
    (s) => s.status === "DRAFT" || s.status === "RETURNED",
  );

  if (reusable) {
    const updated = await prisma.assignmentSubmission.update({
      where: { id: reusable.id },
      data: {
        textBody: input.textBody ?? null,
        fileUrls: input.fileUrls,
        url: input.url ?? null,
        status: input.finalize ? "SUBMITTED" : "DRAFT",
        submittedAt: input.finalize ? now : reusable.submittedAt,
        isLate: input.finalize ? isLate : reusable.isLate,
      },
    });
    if (input.finalize) {
      await emit(channels.classAssignments(a.classId), events.classAssignmentSubmitted, {
        assignmentId, studentId, submissionId: updated.id,
      });
    }
    return updated;
  }

  // Enforce attempt limit (0 = unlimited).
  const finalizedCount = existing.filter(
    (s) => s.status === "SUBMITTED" || s.status === "GRADED",
  ).length;
  if (a.maxAttempts > 0 && finalizedCount >= a.maxAttempts) {
    throw new Error("No attempts remaining");
  }

  const attempt = (existing[0]?.attempt ?? 0) + 1;
  const created = await prisma.assignmentSubmission.create({
    data: {
      assignmentId,
      studentId,
      attempt,
      textBody: input.textBody ?? null,
      fileUrls: input.fileUrls,
      url: input.url ?? null,
      status: input.finalize ? "SUBMITTED" : "DRAFT",
      submittedAt: input.finalize ? now : null,
      isLate: input.finalize ? isLate : false,
    },
  });
  if (input.finalize) {
    await emit(channels.classAssignments(a.classId), events.classAssignmentSubmitted, {
      assignmentId, studentId, submissionId: created.id,
    });
  }
  return created;
}

export async function gradeSubmission(
  submissionId: string,
  graderId: string,
  input: GradeSubmissionInput,
) {
  const sub = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: { assignment: true },
  });
  if (!sub) throw new Error("Submission not found");
  await assertClassOwner(sub.assignment.classId, graderId);

  if (input.score > sub.assignment.maxScore) {
    throw new Error(`Score cannot exceed max score (${sub.assignment.maxScore})`);
  }

  // Apply late penalty if late and policy > 0.
  let finalScore = input.score;
  if (sub.isLate && sub.assignment.latePenalty > 0 && sub.submittedAt && sub.assignment.dueAt) {
    const dayMs = 24 * 60 * 60 * 1000;
    const daysLate = Math.ceil(
      (sub.submittedAt.getTime() - sub.assignment.dueAt.getTime()) / dayMs,
    );
    const penaltyPct = Math.min(100, daysLate * sub.assignment.latePenalty);
    finalScore = Math.max(0, Math.round(finalScore * (1 - penaltyPct / 100)));
  }

  const updated = await prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: {
      score: finalScore,
      feedback: input.feedback ?? null,
      graderId,
      gradedAt: new Date(),
      status: input.returnForRevision ? "RETURNED" : "GRADED",
    },
  });

  await emit(channels.classAssignments(sub.assignment.classId), events.classAssignmentGraded, {
    submissionId, assignmentId: sub.assignmentId, studentId: sub.studentId,
  });
  return updated;
}
