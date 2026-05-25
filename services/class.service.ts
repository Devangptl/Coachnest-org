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
  input: {
    kind?: "GENERAL" | "QUESTION" | "ANNOUNCEMENT_REPLY";
    title: string;
    body: string;
    parentId?: string | null;
    tags?: string[];
  },
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
      tags: input.tags ?? [],
    },
  });
}

export async function getDiscussionThread(
  classId: string,
  discussionId: string,
  userId: string,
) {
  await assertIsMember(classId, userId);
  const thread = await prisma.discussion.findFirst({
    where: { id: discussionId, classId },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      votes: { select: { userId: true } },
      replies: {
        orderBy: [{ createdAt: "asc" }],
        include: {
          author: { select: { id: true, name: true, avatar: true } },
          votes: { select: { userId: true } },
        },
      },
    },
  });
  if (!thread) throw new Error("Discussion not found");
  return thread;
}

export async function replyToDiscussion(
  classId: string,
  parentId: string,
  authorId: string,
  body: string,
) {
  await assertIsMember(classId, authorId);
  const parent = await prisma.discussion.findUnique({
    where: { id: parentId },
    select: { classId: true, title: true, kind: true },
  });
  if (!parent || parent.classId !== classId) {
    throw new Error("Parent discussion not found");
  }
  return prisma.discussion.create({
    data: {
      classId,
      authorId,
      kind: "GENERAL",
      title: parent.title.slice(0, 200),
      body,
      parentId,
    },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
    },
  });
}

export async function updateDiscussion(
  classId: string,
  discussionId: string,
  userId: string,
  input: {
    title?: string;
    body?: string;
    tags?: string[];
    pinned?: boolean;
    resolved?: boolean;
    acceptedReplyId?: string | null;
  },
) {
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) throw new Error("Class not found");

  const thread = await prisma.discussion.findFirst({
    where: { id: discussionId, classId },
  });
  if (!thread) throw new Error("Discussion not found");

  const isOwner = cls.instructorId === userId;
  const isAssistant = isOwner
    ? false
    : !!(await prisma.classAssistant.findUnique({
        where: { classId_userId: { classId, userId } },
      }));
  const isAuthor = thread.authorId === userId;
  const isStaff = isOwner || isAssistant;

  // Field-level permissions:
  // - pinned: staff only
  // - acceptedReplyId / resolved: question author OR staff
  // - title / body / tags: author OR staff
  const data: Record<string, unknown> = {};
  if (input.title !== undefined) {
    if (!isAuthor && !isStaff) throw new Error("Forbidden");
    data.title = input.title;
  }
  if (input.body !== undefined) {
    if (!isAuthor && !isStaff) throw new Error("Forbidden");
    data.body = input.body;
  }
  if (input.tags !== undefined) {
    if (!isAuthor && !isStaff) throw new Error("Forbidden");
    data.tags = input.tags;
  }
  if (input.pinned !== undefined) {
    if (!isStaff) throw new Error("Only instructors can pin");
    data.pinned = input.pinned;
  }
  if (input.resolved !== undefined) {
    if (!isAuthor && !isStaff) throw new Error("Forbidden");
    data.resolved = input.resolved;
  }
  if (input.acceptedReplyId !== undefined) {
    if (!isAuthor && !isStaff) throw new Error("Forbidden");
    if (input.acceptedReplyId) {
      const reply = await prisma.discussion.findFirst({
        where: { id: input.acceptedReplyId, parentId: discussionId },
      });
      if (!reply) throw new Error("Reply not part of this thread");
      data.acceptedReplyId = input.acceptedReplyId;
      data.resolved = true;
    } else {
      data.acceptedReplyId = null;
      data.resolved = false;
    }
  }

  return prisma.discussion.update({
    where: { id: discussionId },
    data,
  });
}

export async function deleteDiscussion(
  classId: string,
  discussionId: string,
  userId: string,
) {
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) throw new Error("Class not found");
  const thread = await prisma.discussion.findFirst({
    where: { id: discussionId, classId },
  });
  if (!thread) throw new Error("Discussion not found");

  const isAuthor = thread.authorId === userId;
  const isOwner = cls.instructorId === userId;
  const isAssistant = isOwner
    ? false
    : !!(await prisma.classAssistant.findUnique({
        where: { classId_userId: { classId, userId } },
      }));
  if (!isAuthor && !isOwner && !isAssistant) throw new Error("Forbidden");

  return prisma.discussion.delete({ where: { id: discussionId } });
}

export async function toggleDiscussionVote(
  classId: string,
  discussionId: string,
  userId: string,
) {
  await assertIsMember(classId, userId);
  const thread = await prisma.discussion.findFirst({
    where: { id: discussionId, classId },
    select: { id: true },
  });
  if (!thread) throw new Error("Discussion not found");

  const existing = await prisma.discussionVote.findUnique({
    where: { discussionId_userId: { discussionId, userId } },
  });
  if (existing) {
    await prisma.discussionVote.delete({
      where: { discussionId_userId: { discussionId, userId } },
    });
    return { voted: false };
  }
  await prisma.discussionVote.create({
    data: { discussionId, userId },
  });
  return { voted: true };
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

/**
 * Rich analytics rollup for a class dashboard.
 *
 * One pass of focused queries → aggregated entirely in JS so the route stays
 * dependency-light. Costs scale with (#students × #lessons) so it's intended
 * for cohorts in the low thousands; beyond that, move per-day series to
 * materialized views.
 */
export async function getClassAnalytics(classId: string, instructorId: string) {
  await assertClassOwner(classId, instructorId);

  const enrollmentsByStatus = await prisma.classEnrollment.groupBy({
    by: ["status"],
    where: { classId },
    _count: { _all: true },
  });

  // Approved-only data feeds the per-student / engagement charts.
  const approvedEnrollments = await prisma.classEnrollment.findMany({
    where: { classId, status: "APPROVED" },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });
  const studentIds = approvedEnrollments.map((e) => e.userId);

  const classCourses = await prisma.classCourse.findMany({
    where: { classId },
    orderBy: { order: "asc" },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          totalLessons: true,
          lessons: {
            select: { id: true, title: true, type: true, duration: true },
          },
        },
      },
    },
  });
  const lessonIds = classCourses.flatMap((cc) => cc.course.lessons.map((l) => l.id));

  const [
    lessonProgress,
    quizzes,
    sessions,
    attendance,
    assignments,
    recentEnrollments,
  ] = await Promise.all([
    studentIds.length && lessonIds.length
      ? prisma.lessonProgress.findMany({
          where: {
            userId: { in: studentIds },
            lessonId: { in: lessonIds },
          },
          select: {
            lessonId: true,
            userId: true,
            completed: true,
            watchedSecs: true,
          },
        })
      : Promise.resolve([] as Array<{
          lessonId: string;
          userId: string;
          completed: boolean;
          watchedSecs: number;
        }>),
    lessonIds.length
      ? prisma.quiz.findMany({
          where: { lessonId: { in: lessonIds } },
          select: {
            id: true,
            title: true,
            passMark: true,
            lessonId: true,
            attempts: {
              where: { userId: { in: studentIds } },
              select: { userId: true, score: true, passed: true },
            },
          },
        })
      : Promise.resolve([] as Array<{
          id: string;
          title: string;
          passMark: number;
          lessonId: string;
          attempts: Array<{ userId: string; score: number; passed: boolean }>;
        }>),
    prisma.liveSession.findMany({
      where: { classId },
      orderBy: { scheduledAt: "asc" },
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        status: true,
        _count: { select: { attendance: true } },
      },
    }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { session: { classId } },
      _count: { _all: true },
    }),
    prisma.assignment.findMany({
      where: { classId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        maxScore: true,
        passingScore: true,
        status: true,
        dueAt: true,
        submissions: {
          where: { studentId: { in: studentIds } },
          select: {
            studentId: true,
            status: true,
            score: true,
            submittedAt: true,
            isLate: true,
          },
        },
      },
    }),
    prisma.classEnrollment.findMany({
      where: { classId, status: "APPROVED" },
      select: { approvedAt: true, requestedAt: true },
      orderBy: { approvedAt: "asc" },
    }),
  ]);

  // ── Aggregate ───────────────────────────────────────────────────────────────

  const totalStudents = approvedEnrollments.length;
  const totalLessons = lessonIds.length;
  const totalLessonSlots = totalStudents * totalLessons;

  let completedLessons = 0;
  let totalWatchSecs = 0;
  for (const p of lessonProgress) {
    if (p.completed) completedLessons += 1;
    totalWatchSecs += p.watchedSecs;
  }
  const avgProgressPct = totalLessonSlots
    ? Math.round((completedLessons / totalLessonSlots) * 100)
    : 0;

  // Active = updated lastActiveAt within 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const activeStudents = approvedEnrollments.filter(
    (e) => e.lastActiveAt && e.lastActiveAt >= sevenDaysAgo,
  ).length;

  // ── Per-lesson engagement ─────────────────────────────────────────────────
  const lessonStats = classCourses.flatMap((cc) =>
    cc.course.lessons.map((l) => {
      const rows = lessonProgress.filter((p) => p.lessonId === l.id);
      const completed = rows.filter((r) => r.completed).length;
      const watchSecs = rows.reduce((acc, r) => acc + r.watchedSecs, 0);
      return {
        lessonId: l.id,
        title: l.title,
        type: l.type,
        courseTitle: cc.course.title,
        completionPct: totalStudents
          ? Math.round((completed / totalStudents) * 100)
          : 0,
        completedCount: completed,
        totalStudents,
        watchSecs,
      };
    }),
  );

  // ── Per-quiz performance ──────────────────────────────────────────────────
  const quizStats = quizzes.map((q) => {
    const attempts = q.attempts;
    // Best attempt per student.
    const bestByStudent = new Map<string, { score: number; passed: boolean }>();
    for (const a of attempts) {
      const prev = bestByStudent.get(a.userId);
      if (!prev || a.score > prev.score) {
        bestByStudent.set(a.userId, { score: a.score, passed: a.passed });
      }
    }
    const best = Array.from(bestByStudent.values());
    const avgScore = best.length
      ? Math.round(best.reduce((acc, b) => acc + b.score, 0) / best.length)
      : 0;
    const passCount = best.filter((b) => b.passed).length;
    return {
      quizId: q.id,
      title: q.title,
      passMark: q.passMark,
      takenBy: bestByStudent.size,
      totalAttempts: attempts.length,
      passCount,
      passRate: bestByStudent.size
        ? Math.round((passCount / bestByStudent.size) * 100)
        : 0,
      avgScore,
    };
  });

  // ── Per-assignment performance ────────────────────────────────────────────
  const assignmentStats = assignments.map((a) => {
    const subs = a.submissions;
    // Latest per student (collapse multiple attempts).
    const latestByStudent = new Map<string, (typeof subs)[number]>();
    for (const s of subs) {
      const prev = latestByStudent.get(s.studentId);
      // status priority: GRADED > SUBMITTED > RETURNED > DRAFT
      const priority = { GRADED: 3, SUBMITTED: 2, RETURNED: 1, DRAFT: 0 } as const;
      if (!prev || priority[s.status] >= priority[prev.status]) {
        latestByStudent.set(s.studentId, s);
      }
    }
    const finalized = Array.from(latestByStudent.values()).filter(
      (s) => s.status === "GRADED" || s.status === "SUBMITTED",
    );
    const graded = finalized.filter((s) => s.status === "GRADED" && s.score !== null);
    const avgScore = graded.length
      ? Math.round(
          graded.reduce((acc, s) => acc + (s.score ?? 0), 0) / graded.length,
        )
      : 0;
    const passing = graded.filter(
      (s) => (s.score ?? 0) >= a.passingScore,
    ).length;
    const lateCount = finalized.filter((s) => s.isLate).length;
    return {
      assignmentId: a.id,
      title: a.title,
      status: a.status,
      maxScore: a.maxScore,
      passingScore: a.passingScore,
      dueAt: a.dueAt,
      submittedCount: finalized.length,
      submissionRate: totalStudents
        ? Math.round((finalized.length / totalStudents) * 100)
        : 0,
      gradedCount: graded.length,
      passCount: passing,
      lateCount,
      avgScore,
    };
  });

  // ── Attendance summary ────────────────────────────────────────────────────
  const attendByStatus: Record<string, number> = {
    PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0,
  };
  for (const row of attendance) {
    attendByStatus[row.status] = row._count?._all ?? 0;
  }
  const totalAttendRows = Object.values(attendByStatus).reduce((a, b) => a + b, 0);
  const attendanceRate = totalAttendRows
    ? Math.round(
        ((attendByStatus.PRESENT + attendByStatus.LATE) / totalAttendRows) * 100,
      )
    : 0;

  // ── Enrollment trend (last 30 days, daily bucket) ─────────────────────────
  const days = 30;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const trend: Array<{ date: string; enrollments: number }> = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    trend.push({ date: d.toISOString().slice(0, 10), enrollments: 0 });
  }
  const trendIndex = new Map(trend.map((t, i) => [t.date, i]));
  for (const r of recentEnrollments) {
    const when = r.approvedAt ?? r.requestedAt;
    if (!when) continue;
    const key = when.toISOString().slice(0, 10);
    const idx = trendIndex.get(key);
    if (idx !== undefined) trend[idx].enrollments += 1;
  }

  // ── Top + struggling students ─────────────────────────────────────────────
  const ranked = [...approvedEnrollments].sort(
    (a, b) =>
      b.xpEarned - a.xpEarned ||
      b.progressPct - a.progressPct,
  );
  const topStudents = ranked.slice(0, 10).map((e) => ({
    userId: e.user.id,
    name: e.user.name,
    avatar: e.user.avatar,
    xpEarned: e.xpEarned,
    progressPct: e.progressPct,
    attendStreak: e.attendStreak,
  }));
  const struggling = ranked
    .filter((e) => e.progressPct < 30)
    .slice(-10)
    .reverse()
    .map((e) => ({
      userId: e.user.id,
      name: e.user.name,
      avatar: e.user.avatar,
      progressPct: e.progressPct,
      lastActiveAt: e.lastActiveAt,
    }));

  // ── Top + bottom lessons by engagement ────────────────────────────────────
  const lessonRanked = [...lessonStats].sort(
    (a, b) => b.completionPct - a.completionPct,
  );
  const topLessons = lessonRanked.slice(0, 5);
  const bottomLessons = lessonRanked
    .filter((l) => l.totalStudents > 0)
    .slice(-5)
    .reverse();

  return {
    kpis: {
      totalStudents,
      activeStudents,
      pendingRequests:
        enrollmentsByStatus.find((e) => e.status === "PENDING")?._count._all ?? 0,
      avgProgressPct,
      attendanceRate,
      totalLiveSessions: sessions.length,
      totalWatchHours: Math.round(totalWatchSecs / 3600),
      totalAssignments: assignments.length,
      totalQuizzes: quizzes.length,
    },
    enrollmentsByStatus: enrollmentsByStatus.map((e) => ({
      status: e.status,
      count: e._count._all,
    })),
    enrollmentTrend: trend,
    attendance: attendByStatus,
    sessions: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      scheduledAt: s.scheduledAt,
      status: s.status,
      attendees: s._count.attendance,
    })),
    lessonStats,
    topLessons,
    bottomLessons,
    quizStats,
    assignmentStats,
    topStudents,
    struggling,
  };
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
