/**
 * Zod validation schemas for Class / Cohort management.
 */
import { z } from "zod";

export const classVisibilityEnum = z.enum(["PUBLIC", "PRIVATE"]);
export const classJoinModeEnum = z.enum(["OPEN", "APPROVAL_REQUIRED", "INVITE_ONLY"]);
export const classStatusEnum = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const classEnrollmentStatusEnum = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "BANNED",
  "WAITLISTED",
]);
export const liveSessionStatusEnum = z.enum(["SCHEDULED", "LIVE", "ENDED", "CANCELLED"]);
export const attendanceStatusEnum = z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);

const classCourseItem = z.object({
  courseId: z.string().min(1),
  order: z.number().int().nonnegative().default(0),
  isRequired: z.boolean().default(true),
  unlockAfterDays: z.number().int().nonnegative().nullable().optional(),
});

export const createClassSchema = z.object({
  name: z.string().min(3).max(120),
  description: z.string().max(5000).optional().nullable(),
  thumbnail: z.string().url().optional().nullable(),
  banner: z.string().url().optional().nullable(),
  visibility: classVisibilityEnum.default("PUBLIC"),
  joinMode: classJoinModeEnum.default("OPEN"),
  maxStudents: z.number().int().positive().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  price: z.number().nonnegative().optional().nullable(),
  isPaid: z.boolean().default(false),
  enableChat: z.boolean().default(true),
  enableDiscussion: z.boolean().default(true),
  enableAttendance: z.boolean().default(false),
  enableLiveClass: z.boolean().default(false),
  enableLeaderboard: z.boolean().default(true),
  enableCertificate: z.boolean().default(true),
  certCompletionPercent: z.number().int().min(0).max(100).default(100),
  certAttendancePercent: z.number().int().min(0).max(100).default(0),
  courses: z.array(classCourseItem).default([]),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;

export const updateClassSchema = createClassSchema.partial().extend({
  status: classStatusEnum.optional(),
});
export type UpdateClassInput = z.infer<typeof updateClassSchema>;

export const reorderCoursesSchema = z.object({
  courses: z.array(
    z.object({
      classCourseId: z.string(),
      order: z.number().int().nonnegative(),
    }),
  ),
});

export const addCourseSchema = classCourseItem;

export const joinClassSchema = z.object({
  inviteCode: z.string().optional(),
});

export const enrollmentDecisionSchema = z.object({
  enrollmentId: z.string(),
  decision: z.enum(["APPROVE", "REJECT", "BAN", "REMOVE"]),
});

export const scheduleLiveSessionSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional().nullable(),
  scheduledAt: z.coerce.date(),
  duration: z.number().int().positive().max(720).default(60),
  meetingUrl: z.string().url().optional().nullable(),
});

export const attendanceMarkSchema = z.object({
  sessionId: z.string(),
  records: z.array(
    z.object({
      userId: z.string(),
      status: attendanceStatusEnum.default("PRESENT"),
      notes: z.string().optional(),
    }),
  ),
});

export const announcementSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(1).max(10000),
  pinned: z.boolean().default(false),
});

export const discussionSchema = z.object({
  kind: z.enum(["GENERAL", "QUESTION", "ANNOUNCEMENT_REPLY"]).default("GENERAL"),
  title: z.string().min(3).max(200),
  body: z.string().min(1).max(10000),
  parentId: z.string().optional().nullable(),
  tags: z.array(z.string().min(1).max(30)).max(8).default([]),
});

export const discussionReplySchema = z.object({
  body: z.string().min(1).max(10000),
});

export const discussionUpdateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  body: z.string().min(1).max(10000).optional(),
  tags: z.array(z.string().min(1).max(30)).max(8).optional(),
  pinned: z.boolean().optional(),
  resolved: z.boolean().optional(),
  acceptedReplyId: z.string().nullable().optional(),
});

export const messageSchema = z.object({
  content: z.string().min(1).max(2000),
});
