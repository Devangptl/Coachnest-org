/**
 * Class / Cohort service layer.
 *
 * Pure functions over Prisma — no HTTP/auth concerns. Authorization is
 * enforced by route handlers / server actions before calling these.
 */
import "server-only";
import { randomBytes } from "crypto";
import slugify from "slugify";
import { prisma } from "@/lib/prisma";
import { channels, events } from "@/lib/realtime/channels";
import { emit } from "@/lib/realtime/emit";
import type {
  CreateClassInput,
  UpdateClassInput,
} from "@/lib/validation/class";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function uniqueSlug(name: string, ignoreId?: string): Promise<string> {
  const base = slugify(name, { lower: true, strict: true }).slice(0, 80) || "class";
  let slug = base;
  let n = 1;
  // Linear probing; collisions are rare.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.class.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

function newInviteCode(): string {
  return randomBytes(6).toString("base64url");
}

// ─── Class CRUD ───────────────────────────────────────────────────────────────

export async function createClass(instructorId: string, input: CreateClassInput) {
  const slug = await uniqueSlug(input.name);

  const inviteCode = input.joinMode === "INVITE_ONLY" ? newInviteCode() : null;

  return prisma.class.create({
    data: {
      name: input.name,
      slug,
      description: input.description ?? null,
      thumbnail: input.thumbnail ?? null,
      banner: input.banner ?? null,
      visibility: input.visibility,
      joinMode: input.joinMode,
      inviteCode,
      maxStudents: input.maxStudents ?? null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      price: input.price ?? null,
      isPaid: input.isPaid,
      enableChat: input.enableChat,
      enableDiscussion: input.enableDiscussion,
      enableAttendance: input.enableAttendance,
      enableLiveClass: input.enableLiveClass,
      enableLeaderboard: input.enableLeaderboard,
      enableCertificate: input.enableCertificate,
      certCompletionPercent: input.certCompletionPercent,
      certAttendancePercent: input.certAttendancePercent,
      instructorId,
      courses: {
        create: input.courses.map((c, i) => ({
          courseId: c.courseId,
          order: c.order ?? i,
          isRequired: c.isRequired ?? true,
          unlockAfterDays: c.unlockAfterDays ?? null,
        })),
      },
    },
    include: { courses: true },
  });
}

export async function updateClass(
  classId: string,
  instructorId: string,
  input: UpdateClassInput,
) {
  const cls = await assertClassOwner(classId, instructorId);

  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (k === "courses") continue; // courses managed via dedicated endpoints
    if (v !== undefined) data[k] = v;
  }

  // Re-slug only on rename
  if (input.name && input.name !== cls.name) {
    data.slug = await uniqueSlug(input.name, classId);
  }

  // Issue invite code when transitioning into INVITE_ONLY without one
  if (input.joinMode === "INVITE_ONLY" && !cls.inviteCode) {
    data.inviteCode = newInviteCode();
  }

  return prisma.class.update({ where: { id: classId }, data });
}

export async function deleteClass(classId: string, instructorId: string) {
  await assertClassOwner(classId, instructorId);
  return prisma.class.delete({ where: { id: classId } });
}

export async function publishClass(classId: string, instructorId: string) {
  await assertClassOwner(classId, instructorId);
  return prisma.class.update({
    where: { id: classId },
    data: { status: "PUBLISHED" },
  });
}

export async function unpublishClass(classId: string, instructorId: string) {
  await assertClassOwner(classId, instructorId);
  return prisma.class.update({
    where: { id: classId },
    data: { status: "DRAFT" },
  });
}

export async function regenerateInviteCode(classId: string, instructorId: string) {
  await assertClassOwner(classId, instructorId);
  return prisma.class.update({
    where: { id: classId },
    data: { inviteCode: newInviteCode() },
  });
}

// ─── Course management within Class ───────────────────────────────────────────

export async function addCourseToClass(
  classId: string,
  instructorId: string,
  input: { courseId: string; order?: number; isRequired?: boolean; unlockAfterDays?: number | null },
) {
  await assertClassOwner(classId, instructorId);

  const max = await prisma.classCourse.aggregate({
    where: { classId },
    _max: { order: true },
  });
  const order = input.order ?? (max._max.order ?? -1) + 1;

  return prisma.classCourse.create({
    data: {
      classId,
      courseId: input.courseId,
      order,
      isRequired: input.isRequired ?? true,
      unlockAfterDays: input.unlockAfterDays ?? null,
    },
  });
}

export async function removeCourseFromClass(
  classId: string,
  classCourseId: string,
  instructorId: string,
) {
  await assertClassOwner(classId, instructorId);
  return prisma.classCourse.delete({ where: { id: classCourseId } });
}

export async function reorderCourses(
  classId: string,
  instructorId: string,
  items: Array<{ classCourseId: string; order: number }>,
) {
  await assertClassOwner(classId, instructorId);
  await prisma.$transaction(
    items.map((it) =>
      prisma.classCourse.update({
        where: { id: it.classCourseId },
        data: { order: it.order },
      }),
    ),
  );
}

// ─── Enrollment / Join flow ───────────────────────────────────────────────────

export async function joinClass(
  userId: string,
  classId: string,
  inviteCode?: string,
) {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { _count: { select: { enrollments: { where: { status: "APPROVED" } } } } },
  });
  if (!cls) throw new Error("Class not found");
  if (cls.status !== "PUBLISHED") throw new Error("Class not available");

  if (cls.joinMode === "INVITE_ONLY") {
    if (!inviteCode || inviteCode !== cls.inviteCode) {
      throw new Error("Invalid invite code");
    }
  }

  if (cls.maxStudents && cls._count.enrollments >= cls.maxStudents) {
    // Auto-waitlist
    return prisma.classEnrollment.upsert({
      where: { classId_userId: { classId, userId } },
      update: {},
      create: { classId, userId, status: "WAITLISTED" },
    });
  }

  const status =
    cls.joinMode === "OPEN" || cls.joinMode === "INVITE_ONLY"
      ? "APPROVED"
      : "PENDING";

  const enrollment = await prisma.classEnrollment.upsert({
    where: { classId_userId: { classId, userId } },
    update: { status, requestedAt: new Date() },
    create: {
      classId,
      userId,
      status,
      approvedAt: status === "APPROVED" ? new Date() : null,
    },
  });

  if (status === "PENDING") {
    await emit(channels.classJoinRequests(classId), events.classJoinRequest, {
      enrollmentId: enrollment.id,
      userId,
    });
  }

  return enrollment;
}

export async function decideEnrollment(
  classId: string,
  instructorId: string,
  enrollmentId: string,
  decision: "APPROVE" | "REJECT" | "BAN" | "REMOVE",
) {
  await assertClassOwner(classId, instructorId);

  if (decision === "REMOVE") {
    const e = await prisma.classEnrollment.delete({ where: { id: enrollmentId } });
    await emit(channels.classJoinRequests(classId), events.classJoinDecision, {
      enrollmentId, decision,
    });
    return e;
  }

  const map = {
    APPROVE: { status: "APPROVED" as const, approvedAt: new Date(), rejectedAt: null, bannedAt: null },
    REJECT:  { status: "REJECTED" as const, rejectedAt: new Date() },
    BAN:     { status: "BANNED"   as const, bannedAt: new Date() },
  };
  const e = await prisma.classEnrollment.update({
    where: { id: enrollmentId },
    data: map[decision],
  });
  await emit(channels.classJoinRequests(classId), events.classJoinDecision, {
    enrollmentId, decision,
  });
  return e;
}

// ─── Live sessions ────────────────────────────────────────────────────────────

export async function scheduleLiveSession(
  classId: string,
  instructorId: string,
  input: {
    title: string;
    description?: string | null;
    scheduledAt: Date;
    duration: number;
    meetingUrl?: string | null;
  },
) {
  await assertClassOwner(classId, instructorId);
  return prisma.liveSession.create({
    data: {
      classId,
      hostId: instructorId,
      title: input.title,
      description: input.description ?? null,
      scheduledAt: input.scheduledAt,
      duration: input.duration,
      meetingUrl: input.meetingUrl ?? null,
    },
  });
}

export async function startLiveSession(
  sessionId: string,
  instructorId: string,
) {
  const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Session not found");
  await assertClassOwner(session.classId, instructorId);

  const updated = await prisma.liveSession.update({
    where: { id: sessionId },
    data: { status: "LIVE", startedAt: new Date() },
  });
  await emit(channels.classLive(session.classId), events.classLiveStarted, {
    sessionId, classId: session.classId,
  });
  return updated;
}

export async function endLiveSession(
  sessionId: string,
  instructorId: string,
  recordingUrl?: string,
) {
  const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Session not found");
  await assertClassOwner(session.classId, instructorId);

  const updated = await prisma.liveSession.update({
    where: { id: sessionId },
    data: {
      status: "ENDED",
      endedAt: new Date(),
      recordingUrl: recordingUrl ?? session.recordingUrl,
    },
  });
  await emit(channels.classLive(session.classId), events.classLiveEnded, { sessionId });
  return updated;
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export async function markAttendance(
  instructorId: string,
  sessionId: string,
  records: Array<{ userId: string; status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; notes?: string }>,
) {
  const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Session not found");
  await assertClassOwner(session.classId, instructorId);

  await prisma.$transaction(
    records.map((r) =>
      prisma.attendance.upsert({
        where: { sessionId_userId: { sessionId, userId: r.userId } },
        update: { status: r.status, notes: r.notes },
        create: { sessionId, userId: r.userId, status: r.status, notes: r.notes },
      }),
    ),
  );

  // Recalculate streaks for attendees marked present
  const presentUserIds = records.filter((r) => r.status === "PRESENT").map((r) => r.userId);
  if (presentUserIds.length) {
    await prisma.classEnrollment.updateMany({
      where: { classId: session.classId, userId: { in: presentUserIds } },
      data: { attendStreak: { increment: 1 }, lastActiveAt: new Date() },
    });
  }
  const absentUserIds = records.filter((r) => r.status === "ABSENT").map((r) => r.userId);
  if (absentUserIds.length) {
    await prisma.classEnrollment.updateMany({
      where: { classId: session.classId, userId: { in: absentUserIds } },
      data: { attendStreak: 0 },
    });
  }

  await emit(channels.classAttendance(session.classId), events.classAttendance, {
    sessionId,
  });
}

// ─── Announcements ────────────────────────────────────────────────────────────

export async function createAnnouncement(
  classId: string,
  authorId: string,
  input: { title: string; body: string; pinned?: boolean },
) {
  await assertCanPost(classId, authorId);
  const a = await prisma.announcement.create({
    data: { classId, authorId, ...input },
  });
  await emit(channels.classAnnouncements(classId), events.classAnnouncement, {
    id: a.id, title: a.title,
  });
  return a;
}

// ─── Discussion ───────────────────────────────────────────────────────────────

export async function createDiscussion(
  classId: string,
  authorId: string,
  input: { kind?: "GENERAL" | "QUESTION" | "ANNOUNCEMENT_REPLY"; title: string; body: string; parentId?: string | null },
) {
  await assertIsMember(classId, authorId);
  return prisma.discussion.create({
    data: {
      classId,
      authorId,
      kind: input.kind ?? "GENERAL",
      title: input.title,
      body: input.body,
      parentId: input.parentId ?? null,
    },
  });
}

// ─── Chat / Messages ──────────────────────────────────────────────────────────

export async function postChatMessage(
  classId: string,
  authorId: string,
  content: string,
) {
  const cls = await assertIsMember(classId, authorId);
  if (!cls.enableChat) throw new Error("Chat disabled for this class");

  const msg = await prisma.message.create({
    data: { classId, authorId, content },
    include: { author: { select: { id: true, name: true, avatar: true } } },
  });
  await emit(channels.classChat(classId), events.classChatMessage, msg);
  return msg;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getClassAnalytics(classId: string, instructorId: string) {
  await assertClassOwner(classId, instructorId);

  const [
    enrollments,
    courses,
    sessions,
    attendance,
    leaderboard,
  ] = await Promise.all([
    prisma.classEnrollment.groupBy({
      by: ["status"],
      where: { classId },
      _count: { _all: true },
    }),
    prisma.classCourse.findMany({
      where: { classId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            _count: { select: { enrollments: true, lessons: true } },
          },
        },
      },
    }),
    prisma.liveSession.count({ where: { classId } }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { session: { classId } },
      _count: { _all: true },
    }),
    prisma.classEnrollment.findMany({
      where: { classId, status: "APPROVED" },
      orderBy: [{ xpEarned: "desc" }, { progressPct: "desc" }],
      take: 10,
      include: { user: { select: { id: true, name: true, avatar: true } } },
    }),
  ]);

  return { enrollments, courses, sessions, attendance, leaderboard };
}

// ─── Certificates ─────────────────────────────────────────────────────────────

export async function maybeIssueCertificate(classId: string, userId: string) {
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls || !cls.enableCertificate) return null;

  const enrollment = await prisma.classEnrollment.findUnique({
    where: { classId_userId: { classId, userId } },
  });
  if (!enrollment || enrollment.status !== "APPROVED") return null;

  const meetsCompletion = enrollment.progressPct >= cls.certCompletionPercent;
  let meetsAttendance = true;

  if (cls.certAttendancePercent > 0) {
    const sessions = await prisma.liveSession.count({
      where: { classId, status: "ENDED" },
    });
    if (sessions > 0) {
      const attended = await prisma.attendance.count({
        where: {
          session: { classId },
          userId,
          status: { in: ["PRESENT", "LATE"] },
        },
      });
      meetsAttendance = (attended / sessions) * 100 >= cls.certAttendancePercent;
    }
  }

  if (!meetsCompletion || !meetsAttendance) return null;

  return prisma.classCertificate.upsert({
    where: {
      classId_userId_type: {
        classId,
        userId,
        type: "COMPLETION",
      },
    },
    update: {},
    create: { classId, userId, type: "COMPLETION" },
  });
}

// ─── Authorization helpers ────────────────────────────────────────────────────

export async function assertClassOwner(classId: string, userId: string) {
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) throw new Error("Class not found");
  if (cls.instructorId !== userId) {
    const isAssistant = await prisma.classAssistant.findUnique({
      where: { classId_userId: { classId, userId } },
    });
    if (!isAssistant) throw new Error("Forbidden");
  }
  return cls;
}

export async function assertIsMember(classId: string, userId: string) {
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) throw new Error("Class not found");
  if (cls.instructorId === userId) return cls;
  const enrollment = await prisma.classEnrollment.findUnique({
    where: { classId_userId: { classId, userId } },
  });
  if (!enrollment || enrollment.status !== "APPROVED") {
    throw new Error("Not a member of this class");
  }
  return cls;
}

async function assertCanPost(classId: string, userId: string) {
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) throw new Error("Class not found");
  if (cls.instructorId === userId) return cls;
  const isAssistant = await prisma.classAssistant.findUnique({
    where: { classId_userId: { classId, userId } },
  });
  if (!isAssistant) throw new Error("Only instructors/assistants can post announcements");
  return cls;
}
