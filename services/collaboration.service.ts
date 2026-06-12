/**
 * Course Collaboration Service.
 *
 * Manages the many-to-many mapping between courses and instructors via
 * the `CourseCollaborator` model, plus the email-based invite flow, the
 * audit log, and the revenue-share split helper used by the payment
 * pipeline.
 *
 * Role semantics:
 *   OWNER         — full control, including managing collaborators & splits.
 *                   Exactly one OWNER row per course (mirrors course.createdById).
 *   CO_INSTRUCTOR — full edit access, listed publicly, eligible for revenue share.
 *   EDITOR        — edit content (sections, lessons, quizzes), not listed publicly.
 *   VIEWER        — read-only visibility into course internals.
 */
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sendCollaborationInviteEmail } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase";
import type { CourseCollaboratorRole, Prisma } from "@/lib/generated/prisma/client";

const INVITE_EXPIRY_DAYS = 14;

// ─── Permission helpers ──────────────────────────────────────────────────────

export type CollaboratorPermission = {
  role: CourseCollaboratorRole;
  canManageCollaborators: boolean;
  canEditContent: boolean;
  canPublish: boolean;
  canDeleteCourse: boolean;
};

/**
 * Return the requesting user's permission set on the course, or null if
 * they have no role on it. Admins are not handled here — callers should
 * short-circuit ADMIN role at the route boundary.
 */
export async function getCollaboratorPermission(
  courseId: string,
  userId: string,
): Promise<CollaboratorPermission | null> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { createdById: true },
  });
  if (!course) return null;

  if (course.createdById === userId) {
    return {
      role: "OWNER",
      canManageCollaborators: true,
      canEditContent: true,
      canPublish: true,
      canDeleteCourse: true,
    };
  }

  const collab = await prisma.courseCollaborator.findUnique({
    where: { courseId_userId: { courseId, userId } },
    select: { role: true, acceptedAt: true },
  });
  if (!collab || !collab.acceptedAt) return null;

  switch (collab.role) {
    case "OWNER": // shouldn't happen — owner is via createdById
      return {
        role: "OWNER",
        canManageCollaborators: true,
        canEditContent: true,
        canPublish: true,
        canDeleteCourse: true,
      };
    case "CO_INSTRUCTOR":
      return {
        role: "CO_INSTRUCTOR",
        canManageCollaborators: false,
        canEditContent: true,
        canPublish: true,
        canDeleteCourse: false,
      };
    case "EDITOR":
      return {
        role: "EDITOR",
        canManageCollaborators: false,
        canEditContent: true,
        canPublish: false,
        canDeleteCourse: false,
      };
    case "VIEWER":
      return {
        role: "VIEWER",
        canManageCollaborators: false,
        canEditContent: false,
        canPublish: false,
        canDeleteCourse: false,
      };
  }
}

export async function canEditCourseContent(courseId: string, userId: string): Promise<boolean> {
  const perm = await getCollaboratorPermission(courseId, userId);
  return Boolean(perm?.canEditContent);
}

export async function canManageCollaborators(courseId: string, userId: string): Promise<boolean> {
  const perm = await getCollaboratorPermission(courseId, userId);
  return Boolean(perm?.canManageCollaborators);
}

/**
 * Authorization gate shared by the lesson/section/quiz/reorder routes —
 * returns the resolved permission when the user can edit the course,
 * or null when they can't. Admins bypass. Use in API handlers:
 *
 *   const ok = await authorizeCourseEdit(session, courseId);
 *   if (!ok) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
 */
export async function authorizeCourseEdit(
  session: { role: string; userId: string } | null,
  courseId: string,
): Promise<boolean> {
  if (!session) return false;
  if (session.role === "ADMIN") return true;

  // Organization courses: ORG_ADMIN edits any org course; ORG_INSTRUCTOR
  // edits the org courses they created. Org members hold platform role
  // STUDENT, so this must run before the INSTRUCTOR gate below.
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { organizationId: true, createdById: true },
  });
  if (course?.organizationId) {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: session.userId,
          organizationId: course.organizationId,
        },
      },
      select: { role: true },
    });
    if (!membership) return false;
    if (membership.role === "ORG_ADMIN") return true;
    return membership.role === "ORG_INSTRUCTOR" && course.createdById === session.userId;
  }

  if (session.role !== "INSTRUCTOR") return false;
  return canEditCourseContent(courseId, session.userId);
}

// ─── Listing ──────────────────────────────────────────────────────────────────

export async function getCourseCollaborators(courseId: string) {
  const [course, collaborators] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId },
      select: {
        createdById: true,
        createdBy: {
          select: { id: true, name: true, email: true, avatar: true, headline: true },
        },
      },
    }),
    prisma.courseCollaborator.findMany({
      where: { courseId },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true, headline: true } },
      },
    }),
  ]);

  if (!course) return [];

  const rows = collaborators.map((c) => ({
    id: c.id,
    userId: c.userId,
    role: c.role,
    revenueShare: Number(c.revenueShare),
    isPublic: c.isPublic,
    acceptedAt: c.acceptedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    user: c.user,
  }));

  // Ensure OWNER row is present (synthetic if not stored).
  const hasOwnerRow = rows.some((r) => r.role === "OWNER");
  if (!hasOwnerRow && course.createdBy) {
    rows.unshift({
      id: `owner:${course.createdById}`,
      userId: course.createdById,
      role: "OWNER",
      revenueShare: 100,
      isPublic: true,
      acceptedAt: new Date(0).toISOString(),
      createdAt: new Date(0).toISOString(),
      user: course.createdBy,
    });
  }

  return rows;
}

export async function getCoursePendingInvites(courseId: string) {
  const invites = await prisma.courseCollaborationInvite.findMany({
    where: { courseId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: {
      invitedBy: { select: { id: true, name: true, email: true } },
    },
  });
  return invites.map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    revenueShare: Number(i.revenueShare),
    expiresAt: i.expiresAt.toISOString(),
    createdAt: i.createdAt.toISOString(),
    invitedBy: i.invitedBy,
  }));
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export async function logCourseActivity(
  courseId: string,
  userId: string,
  action: string,
  meta?: Prisma.InputJsonValue,
) {
  try {
    await prisma.courseActivityLog.create({
      data: { courseId, userId, action, meta },
    });
  } catch (err) {
    console.error("[collaboration] failed to log activity:", err);
  }
}

export async function getCourseActivityLog(courseId: string, limit = 100) {
  const events = await prisma.courseActivityLog.findMany({
    where: { courseId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { id: true, name: true, avatar: true, email: true } } },
  });
  return events.map((e) => ({
    id: e.id,
    action: e.action,
    meta: e.meta,
    createdAt: e.createdAt.toISOString(),
    user: e.user,
  }));
}

// ─── Invites ──────────────────────────────────────────────────────────────────

function newToken() {
  return randomBytes(24).toString("hex");
}

export async function inviteCollaborator(opts: {
  courseId: string;
  email: string;
  role: CourseCollaboratorRole;
  revenueShare: number;
  invitedById: string;
  message?: string;
}) {
  const email = opts.email.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid email address is required.");
  }
  if (opts.role === "OWNER") {
    throw new Error("OWNER role cannot be assigned via invite.");
  }
  if (opts.revenueShare < 0 || opts.revenueShare > 100) {
    throw new Error("Revenue share must be between 0 and 100.");
  }

  const course = await prisma.course.findUnique({
    where: { id: opts.courseId },
    select: { id: true, title: true, createdById: true, createdBy: { select: { name: true } } },
  });
  if (!course) throw new Error("Course not found.");

  // Cannot invite the course owner.
  const targetUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true },
  });
  if (targetUser && targetUser.id === course.createdById) {
    throw new Error("This user already owns the course.");
  }

  // If already an active collaborator, fail fast.
  if (targetUser) {
    const existing = await prisma.courseCollaborator.findUnique({
      where: { courseId_userId: { courseId: opts.courseId, userId: targetUser.id } },
    });
    if (existing) {
      throw new Error("This user is already a collaborator on the course.");
    }
  }

  // De-duplicate pending invites — refresh the existing row rather than creating another.
  const existingInvite = await prisma.courseCollaborationInvite.findFirst({
    where: { courseId: opts.courseId, email, status: "PENDING" },
  });

  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const token = newToken();

  const invite = existingInvite
    ? await prisma.courseCollaborationInvite.update({
        where: { id: existingInvite.id },
        data: {
          role: opts.role,
          revenueShare: opts.revenueShare,
          invitedById: opts.invitedById,
          message: opts.message,
          token,
          expiresAt,
        },
      })
    : await prisma.courseCollaborationInvite.create({
        data: {
          courseId: opts.courseId,
          email,
          token,
          role: opts.role,
          revenueShare: opts.revenueShare,
          invitedById: opts.invitedById,
          message: opts.message,
          expiresAt,
        },
      });

  const inviter = await prisma.user.findUnique({
    where: { id: opts.invitedById },
    select: { name: true },
  });

  // In-app notification when the invitee already has an account.
  if (targetUser) {
    await createNotification({
      data: {
        userId: targetUser.id,
        title: `You've been invited to collaborate on "${course.title}"`,
        body: `${inviter?.name ?? "An instructor"} invited you as ${opts.role.replace(/_/g, " ").toLowerCase()}.`,
        type: "SYSTEM",
        link: `/instructor/invitations?token=${token}`,
      },
    }).catch(console.error);
  }

  // Fire-and-forget email.
  sendCollaborationInviteEmail({
    to: email,
    courseTitle: course.title,
    inviterName: inviter?.name ?? course.createdBy?.name ?? "An instructor",
    role: opts.role,
    revenueShare: opts.revenueShare,
    message: opts.message,
    token,
  }).catch((err) => console.error("[collaboration] invite email failed:", err));

  await logCourseActivity(opts.courseId, opts.invitedById, "collaborator.invited", {
    email,
    role: opts.role,
    revenueShare: opts.revenueShare,
  });

  return {
    id: invite.id,
    token: invite.token,
    email: invite.email,
    role: invite.role,
    revenueShare: Number(invite.revenueShare),
    expiresAt: invite.expiresAt.toISOString(),
  };
}

export async function revokeInvite(inviteId: string, actorId: string) {
  const invite = await prisma.courseCollaborationInvite.findUnique({
    where: { id: inviteId },
    select: { id: true, courseId: true, status: true, email: true },
  });
  if (!invite) throw new Error("Invite not found.");
  if (invite.status !== "PENDING") throw new Error("Invite is no longer pending.");

  const allowed = await canManageCollaborators(invite.courseId, actorId);
  if (!allowed) throw new Error("Forbidden.");

  await prisma.courseCollaborationInvite.update({
    where: { id: inviteId },
    data: { status: "REVOKED", revokedAt: new Date() },
  });

  await logCourseActivity(invite.courseId, actorId, "collaborator.invite_revoked", {
    inviteId,
    email: invite.email,
  });
}

export async function acceptInvite(token: string, userId: string) {
  const invite = await prisma.courseCollaborationInvite.findUnique({
    where: { token },
  });
  if (!invite) throw new Error("Invite not found.");
  if (invite.status !== "PENDING") throw new Error(`Invite is ${invite.status.toLowerCase()}.`);

  if (invite.expiresAt < new Date()) {
    await prisma.courseCollaborationInvite.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    });
    throw new Error("This invite has expired.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, instructorStatus: true },
  });
  if (!user) throw new Error("User not found.");

  // Match email against the user's account (case-insensitive).
  if (user.email.trim().toLowerCase() !== invite.email.trim().toLowerCase()) {
    throw new Error("This invite was sent to a different email address.");
  }

  // Atomically create the collaborator record and mark the invite accepted.
  await prisma.$transaction([
    prisma.courseCollaborator.upsert({
      where: { courseId_userId: { courseId: invite.courseId, userId: user.id } },
      create: {
        courseId: invite.courseId,
        userId: user.id,
        role: invite.role,
        revenueShare: invite.revenueShare,
        addedById: invite.invitedById,
        acceptedAt: new Date(),
      },
      update: {
        role: invite.role,
        revenueShare: invite.revenueShare,
        acceptedAt: new Date(),
      },
    }),
    prisma.courseCollaborationInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    }),
  ]);

  // Promote the user so they can actually access the /instructor portal.
  // Middleware reads `role` from Supabase Auth app_metadata, so we mirror
  // the change both in Prisma and in Supabase. We only auto-promote when
  // the user isn't already an APPROVED instructor or an admin.
  const needsPromotion =
    user.role !== "ADMIN" &&
    !(user.role === "INSTRUCTOR" && user.instructorStatus === "APPROVED");

  if (needsPromotion) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: "INSTRUCTOR",
        instructorStatus: "APPROVED",
        instructorReviewedAt: new Date(),
      },
    });

    try {
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        app_metadata: { role: "INSTRUCTOR", instructorStatus: "APPROVED" },
      });
    } catch (err) {
      console.error("[collaboration] failed to mirror role to Supabase Auth:", err);
    }
  }

  // Notify the inviter that their invite was accepted.
  await createNotification({
    data: {
      userId: invite.invitedById,
      title: `${user.name} accepted your collaboration invite`,
      body: `They joined the course as ${invite.role.replace(/_/g, " ").toLowerCase()}.`,
      type: "SYSTEM",
      link: `/instructor/courses/${invite.courseId}/edit`,
    },
  }).catch(console.error);

  await logCourseActivity(invite.courseId, user.id, "collaborator.joined", {
    role: invite.role,
    revenueShare: Number(invite.revenueShare),
  });

  return { courseId: invite.courseId };
}

export async function declineInvite(token: string, userId: string) {
  const invite = await prisma.courseCollaborationInvite.findUnique({ where: { token } });
  if (!invite) throw new Error("Invite not found.");
  if (invite.status !== "PENDING") throw new Error(`Invite is ${invite.status.toLowerCase()}.`);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user) throw new Error("User not found.");
  if (user.email.trim().toLowerCase() !== invite.email.trim().toLowerCase()) {
    throw new Error("This invite was sent to a different email address.");
  }

  await prisma.courseCollaborationInvite.update({
    where: { id: invite.id },
    data: { status: "DECLINED", declinedAt: new Date() },
  });

  await createNotification({
    data: {
      userId: invite.invitedById,
      title: `${user.name} declined your collaboration invite`,
      body: `They chose not to join the course.`,
      type: "SYSTEM",
      link: `/instructor/courses/${invite.courseId}/edit`,
    },
  }).catch(console.error);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function updateCollaborator(opts: {
  courseId: string;
  userId: string;
  actorId: string;
  role?: CourseCollaboratorRole;
  revenueShare?: number;
  isPublic?: boolean;
}) {
  const allowed = await canManageCollaborators(opts.courseId, opts.actorId);
  if (!allowed) throw new Error("Forbidden.");

  if (opts.role === "OWNER") {
    throw new Error("OWNER role cannot be set directly. Use transferOwnership.");
  }
  if (opts.revenueShare !== undefined && (opts.revenueShare < 0 || opts.revenueShare > 100)) {
    throw new Error("Revenue share must be between 0 and 100.");
  }

  const data: Prisma.CourseCollaboratorUpdateInput = {};
  if (opts.role !== undefined) data.role = opts.role;
  if (opts.revenueShare !== undefined) data.revenueShare = opts.revenueShare;
  if (opts.isPublic !== undefined) data.isPublic = opts.isPublic;

  const updated = await prisma.courseCollaborator.update({
    where: { courseId_userId: { courseId: opts.courseId, userId: opts.userId } },
    data,
  });

  await logCourseActivity(opts.courseId, opts.actorId, "collaborator.updated", {
    targetUserId: opts.userId,
    changes: { role: opts.role, revenueShare: opts.revenueShare, isPublic: opts.isPublic },
  });

  return {
    id: updated.id,
    userId: updated.userId,
    role: updated.role,
    revenueShare: Number(updated.revenueShare),
    isPublic: updated.isPublic,
  };
}

export async function removeCollaborator(courseId: string, userId: string, actorId: string) {
  const allowed = await canManageCollaborators(courseId, actorId);
  if (!allowed) throw new Error("Forbidden.");

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { createdById: true },
  });
  if (!course) throw new Error("Course not found.");
  if (course.createdById === userId) {
    throw new Error("Course ownership cannot be removed without transfer.");
  }

  await prisma.courseCollaborator.delete({
    where: { courseId_userId: { courseId, userId } },
  });

  await logCourseActivity(courseId, actorId, "collaborator.removed", {
    targetUserId: userId,
  });

  await createNotification({
    data: {
      userId,
      title: `You were removed from a course collaboration`,
      body: `An owner removed you from a course you were collaborating on.`,
      type: "SYSTEM",
    },
  }).catch(console.error);
}

// ─── Revenue split ────────────────────────────────────────────────────────────

/**
 * Resolve how a confirmed instructor-revenue payout should be divided
 * between the course owner and any active collaborators.
 *
 * Splits are based on the configured `revenueShare` percentages on each
 * CourseCollaborator row. The owner's implicit share is `100 - Σ(others)`.
 * If the configured shares are invalid (sum > 100 or owner share would be
 * negative), the entire amount falls back to the owner — never lose money.
 */
export async function resolveRevenueShares(
  courseId: string,
  totalInstructorRevenue: number,
): Promise<{ userId: string; amount: number; share: number }[]> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { createdById: true },
  });
  if (!course) return [];

  const collaborators = await prisma.courseCollaborator.findMany({
    where: { courseId, acceptedAt: { not: null }, NOT: { role: "OWNER" } },
    select: { userId: true, revenueShare: true },
  });

  const others = collaborators
    .map((c) => ({ userId: c.userId, share: Number(c.revenueShare) }))
    .filter((c) => c.share > 0);

  const collaboratorsTotal = others.reduce((s, c) => s + c.share, 0);

  if (collaboratorsTotal > 100 || collaboratorsTotal < 0) {
    return [{ userId: course.createdById, share: 100, amount: round2(totalInstructorRevenue) }];
  }

  const ownerShare = 100 - collaboratorsTotal;
  const splits = [
    { userId: course.createdById, share: ownerShare, amount: round2((totalInstructorRevenue * ownerShare) / 100) },
    ...others.map((c) => ({
      userId: c.userId,
      share: c.share,
      amount: round2((totalInstructorRevenue * c.share) / 100),
    })),
  ];

  // Distribute rounding residue to the owner so the total reconciles exactly.
  const distributed = splits.reduce((s, x) => s + x.amount, 0);
  const residue = round2(totalInstructorRevenue - distributed);
  if (residue !== 0 && splits.length > 0) {
    splits[0].amount = round2(splits[0].amount + residue);
  }

  return splits;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Validate that the proposed revenue splits across a course don't add
 * up to more than 100. Returns the total used so callers can show it in
 * the UI.
 */
export async function getRevenueShareTotal(courseId: string): Promise<number> {
  const rows = await prisma.courseCollaborator.findMany({
    where: { courseId, NOT: { role: "OWNER" } },
    select: { revenueShare: true },
  });
  return rows.reduce((s, r) => s + Number(r.revenueShare), 0);
}

// ─── User-facing queries ──────────────────────────────────────────────────────

export async function getMyPendingInvites(email: string) {
  const invites = await prisma.courseCollaborationInvite.findMany({
    where: {
      email: email.toLowerCase(),
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    include: {
      course: { select: { id: true, title: true, slug: true, thumbnail: true } },
      invitedBy: { select: { id: true, name: true, avatar: true } },
    },
  });
  return invites.map((i) => ({
    id: i.id,
    token: i.token,
    role: i.role,
    revenueShare: Number(i.revenueShare),
    message: i.message,
    expiresAt: i.expiresAt.toISOString(),
    createdAt: i.createdAt.toISOString(),
    course: i.course,
    invitedBy: i.invitedBy,
  }));
}

/**
 * Prisma `where` fragment matching every course this user is part of —
 * either as the owner OR as an accepted collaborator. Reuse this in
 * instructor-scoped queries so collaborated courses appear consistently
 * across dashboard, analytics, students, etc.
 */
export function instructorScopedCourseWhere(userId: string): Prisma.CourseWhereInput {
  return {
    OR: [
      { createdById: userId },
      { collaborators: { some: { userId, acceptedAt: { not: null } } } },
    ],
  };
}

export async function getMyCollaboratedCourses(userId: string) {
  const collabs = await prisma.courseCollaborator.findMany({
    where: { userId, acceptedAt: { not: null } },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          thumbnail: true,
          status: true,
          createdAt: true,
          createdBy: { select: { id: true, name: true, avatar: true } },
          _count: { select: { enrollments: true, lessons: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return collabs.map((c) => ({
    role: c.role,
    revenueShare: Number(c.revenueShare),
    joinedAt: c.acceptedAt?.toISOString() ?? c.createdAt.toISOString(),
    course: c.course,
  }));
}
