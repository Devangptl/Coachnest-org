-- Migration: Class / Cohort Management System
-- Creates all tables, enums, indexes, and foreign keys for the class/cohort feature.

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE "ClassVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "ClassJoinMode"   AS ENUM ('OPEN', 'APPROVAL_REQUIRED', 'INVITE_ONLY');
CREATE TYPE "ClassStatus"     AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TYPE "ClassEnrollmentStatus" AS ENUM (
  'PENDING', 'APPROVED', 'REJECTED', 'BANNED', 'WAITLISTED'
);

CREATE TYPE "ClassMemberRole" AS ENUM ('STUDENT', 'ASSISTANT');

CREATE TYPE "LiveSessionStatus" AS ENUM (
  'SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED'
);

CREATE TYPE "AttendanceStatus" AS ENUM (
  'PRESENT', 'ABSENT', 'LATE', 'EXCUSED'
);

CREATE TYPE "DiscussionKind" AS ENUM (
  'GENERAL', 'QUESTION', 'ANNOUNCEMENT_REPLY'
);

CREATE TYPE "ClassCertificateType" AS ENUM ('COMPLETION', 'ATTENDANCE');

-- ─── classes ──────────────────────────────────────────────────────────────────

CREATE TABLE "classes" (
  "id"                   TEXT          NOT NULL,
  "name"                 TEXT          NOT NULL,
  "slug"                 TEXT          NOT NULL,
  "description"          TEXT,
  "thumbnail"            TEXT,
  "banner"               TEXT,
  "visibility"           "ClassVisibility"  NOT NULL DEFAULT 'PUBLIC',
  "joinMode"             "ClassJoinMode"    NOT NULL DEFAULT 'OPEN',
  "status"               "ClassStatus"      NOT NULL DEFAULT 'DRAFT',
  "inviteCode"           TEXT,
  "maxStudents"          INTEGER,
  "startDate"            TIMESTAMP(3),
  "endDate"              TIMESTAMP(3),
  "price"                DECIMAL(10,2),
  "isPaid"               BOOLEAN       NOT NULL DEFAULT false,
  "enableChat"           BOOLEAN       NOT NULL DEFAULT true,
  "enableDiscussion"     BOOLEAN       NOT NULL DEFAULT true,
  "enableAttendance"     BOOLEAN       NOT NULL DEFAULT false,
  "enableLiveClass"      BOOLEAN       NOT NULL DEFAULT false,
  "enableLeaderboard"    BOOLEAN       NOT NULL DEFAULT true,
  "enableCertificate"    BOOLEAN       NOT NULL DEFAULT true,
  "certCompletionPercent" INTEGER      NOT NULL DEFAULT 100,
  "certAttendancePercent" INTEGER      NOT NULL DEFAULT 0,
  "instructorId"         TEXT          NOT NULL,
  "createdAt"            TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "classes_pkey"            PRIMARY KEY ("id"),
  CONSTRAINT "classes_slug_key"        UNIQUE ("slug"),
  CONSTRAINT "classes_inviteCode_key"  UNIQUE ("inviteCode")
);

CREATE INDEX "classes_instructorId_idx"       ON "classes" ("instructorId");
CREATE INDEX "classes_status_visibility_idx"  ON "classes" ("status", "visibility");

ALTER TABLE "classes"
  ADD CONSTRAINT "classes_instructorId_fkey"
  FOREIGN KEY ("instructorId") REFERENCES "users" ("id") ON DELETE CASCADE;

-- ─── class_courses ────────────────────────────────────────────────────────────

CREATE TABLE "class_courses" (
  "id"              TEXT     NOT NULL,
  "classId"         TEXT     NOT NULL,
  "courseId"        TEXT     NOT NULL,
  "order"           INTEGER  NOT NULL DEFAULT 0,
  "isRequired"      BOOLEAN  NOT NULL DEFAULT true,
  "unlockAfterDays" INTEGER,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "class_courses_pkey"              PRIMARY KEY ("id"),
  CONSTRAINT "class_courses_classId_courseId_key" UNIQUE ("classId", "courseId")
);

CREATE INDEX "class_courses_classId_order_idx" ON "class_courses" ("classId", "order");

ALTER TABLE "class_courses"
  ADD CONSTRAINT "class_courses_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "classes" ("id") ON DELETE CASCADE;

ALTER TABLE "class_courses"
  ADD CONSTRAINT "class_courses_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "courses" ("id") ON DELETE CASCADE;

-- ─── class_enrollments ────────────────────────────────────────────────────────

CREATE TABLE "class_enrollments" (
  "id"            TEXT                    NOT NULL,
  "classId"       TEXT                    NOT NULL,
  "userId"        TEXT                    NOT NULL,
  "status"        "ClassEnrollmentStatus" NOT NULL DEFAULT 'APPROVED',
  "role"          "ClassMemberRole"       NOT NULL DEFAULT 'STUDENT',
  "requestedAt"   TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt"    TIMESTAMP(3),
  "rejectedAt"    TIMESTAMP(3),
  "bannedAt"      TIMESTAMP(3),
  "completedAt"   TIMESTAMP(3),
  "progressPct"   INTEGER                 NOT NULL DEFAULT 0,
  "xpEarned"      INTEGER                 NOT NULL DEFAULT 0,
  "attendStreak"  INTEGER                 NOT NULL DEFAULT 0,
  "lastActiveAt"  TIMESTAMP(3),

  CONSTRAINT "class_enrollments_pkey"                 PRIMARY KEY ("id"),
  CONSTRAINT "class_enrollments_classId_userId_key"   UNIQUE ("classId", "userId")
);

CREATE INDEX "class_enrollments_classId_status_idx"  ON "class_enrollments" ("classId", "status");
CREATE INDEX "class_enrollments_userId_idx"          ON "class_enrollments" ("userId");

ALTER TABLE "class_enrollments"
  ADD CONSTRAINT "class_enrollments_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "classes" ("id") ON DELETE CASCADE;

ALTER TABLE "class_enrollments"
  ADD CONSTRAINT "class_enrollments_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE;

-- ─── class_assistants ─────────────────────────────────────────────────────────

CREATE TABLE "class_assistants" (
  "id"        TEXT         NOT NULL,
  "classId"   TEXT         NOT NULL,
  "userId"    TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "class_assistants_pkey"              PRIMARY KEY ("id"),
  CONSTRAINT "class_assistants_classId_userId_key" UNIQUE ("classId", "userId")
);

ALTER TABLE "class_assistants"
  ADD CONSTRAINT "class_assistants_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "classes" ("id") ON DELETE CASCADE;

ALTER TABLE "class_assistants"
  ADD CONSTRAINT "class_assistants_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE;

-- ─── live_sessions ────────────────────────────────────────────────────────────

CREATE TABLE "live_sessions" (
  "id"           TEXT                NOT NULL,
  "classId"      TEXT                NOT NULL,
  "hostId"       TEXT                NOT NULL,
  "title"        TEXT                NOT NULL,
  "description"  TEXT,
  "scheduledAt"  TIMESTAMP(3)        NOT NULL,
  "duration"     INTEGER             NOT NULL DEFAULT 60,
  "meetingUrl"   TEXT,
  "recordingUrl" TEXT,
  "status"       "LiveSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
  "startedAt"    TIMESTAMP(3),
  "endedAt"      TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3)        NOT NULL,

  CONSTRAINT "live_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "live_sessions_classId_scheduledAt_idx" ON "live_sessions" ("classId", "scheduledAt");

ALTER TABLE "live_sessions"
  ADD CONSTRAINT "live_sessions_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "classes" ("id") ON DELETE CASCADE;

ALTER TABLE "live_sessions"
  ADD CONSTRAINT "live_sessions_hostId_fkey"
  FOREIGN KEY ("hostId") REFERENCES "users" ("id");

-- ─── class_attendance ─────────────────────────────────────────────────────────

CREATE TABLE "class_attendance" (
  "id"        TEXT               NOT NULL,
  "sessionId" TEXT               NOT NULL,
  "userId"    TEXT               NOT NULL,
  "status"    "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
  "joinedAt"  TIMESTAMP(3),
  "leftAt"    TIMESTAMP(3),
  "notes"     TEXT,

  CONSTRAINT "class_attendance_pkey"               PRIMARY KEY ("id"),
  CONSTRAINT "class_attendance_sessionId_userId_key" UNIQUE ("sessionId", "userId")
);

CREATE INDEX "class_attendance_userId_idx" ON "class_attendance" ("userId");

ALTER TABLE "class_attendance"
  ADD CONSTRAINT "class_attendance_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "live_sessions" ("id") ON DELETE CASCADE;

ALTER TABLE "class_attendance"
  ADD CONSTRAINT "class_attendance_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE;

-- ─── class_announcements ──────────────────────────────────────────────────────

CREATE TABLE "class_announcements" (
  "id"        TEXT         NOT NULL,
  "classId"   TEXT         NOT NULL,
  "authorId"  TEXT         NOT NULL,
  "title"     TEXT         NOT NULL,
  "body"      TEXT         NOT NULL,
  "pinned"    BOOLEAN      NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "class_announcements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "class_announcements_classId_createdAt_idx"
  ON "class_announcements" ("classId", "createdAt");

ALTER TABLE "class_announcements"
  ADD CONSTRAINT "class_announcements_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "classes" ("id") ON DELETE CASCADE;

ALTER TABLE "class_announcements"
  ADD CONSTRAINT "class_announcements_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users" ("id");

-- ─── class_discussions ────────────────────────────────────────────────────────

CREATE TABLE "class_discussions" (
  "id"        TEXT             NOT NULL,
  "classId"   TEXT             NOT NULL,
  "authorId"  TEXT             NOT NULL,
  "kind"      "DiscussionKind" NOT NULL DEFAULT 'GENERAL',
  "title"     TEXT             NOT NULL,
  "body"      TEXT             NOT NULL,
  "parentId"  TEXT,
  "resolved"  BOOLEAN          NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3)     NOT NULL,

  CONSTRAINT "class_discussions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "class_discussions_classId_createdAt_idx"
  ON "class_discussions" ("classId", "createdAt");
CREATE INDEX "class_discussions_parentId_idx"
  ON "class_discussions" ("parentId");

ALTER TABLE "class_discussions"
  ADD CONSTRAINT "class_discussions_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "classes" ("id") ON DELETE CASCADE;

ALTER TABLE "class_discussions"
  ADD CONSTRAINT "class_discussions_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users" ("id");

ALTER TABLE "class_discussions"
  ADD CONSTRAINT "class_discussions_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "class_discussions" ("id") ON DELETE CASCADE;

-- ─── class_messages ───────────────────────────────────────────────────────────

CREATE TABLE "class_messages" (
  "id"        TEXT         NOT NULL,
  "classId"   TEXT         NOT NULL,
  "authorId"  TEXT         NOT NULL,
  "content"   TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "class_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "class_messages_classId_createdAt_idx"
  ON "class_messages" ("classId", "createdAt");

ALTER TABLE "class_messages"
  ADD CONSTRAINT "class_messages_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "classes" ("id") ON DELETE CASCADE;

ALTER TABLE "class_messages"
  ADD CONSTRAINT "class_messages_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users" ("id");

-- ─── class_xp_events ──────────────────────────────────────────────────────────

CREATE TABLE "class_xp_events" (
  "id"        TEXT         NOT NULL,
  "classId"   TEXT         NOT NULL,
  "userId"    TEXT         NOT NULL,
  "amount"    INTEGER      NOT NULL,
  "reason"    TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "class_xp_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "class_xp_events_classId_userId_idx"
  ON "class_xp_events" ("classId", "userId");

ALTER TABLE "class_xp_events"
  ADD CONSTRAINT "class_xp_events_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "classes" ("id") ON DELETE CASCADE;

ALTER TABLE "class_xp_events"
  ADD CONSTRAINT "class_xp_events_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE;

-- ─── class_certificates ───────────────────────────────────────────────────────

CREATE TABLE "class_certificates" (
  "id"             TEXT                   NOT NULL,
  "classId"        TEXT                   NOT NULL,
  "userId"         TEXT                   NOT NULL,
  "type"           "ClassCertificateType" NOT NULL,
  "issuedAt"       TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "certificateUrl" TEXT,

  CONSTRAINT "class_certificates_pkey"                      PRIMARY KEY ("id"),
  CONSTRAINT "class_certificates_classId_userId_type_key"   UNIQUE ("classId", "userId", "type")
);

ALTER TABLE "class_certificates"
  ADD CONSTRAINT "class_certificates_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "classes" ("id") ON DELETE CASCADE;

ALTER TABLE "class_certificates"
  ADD CONSTRAINT "class_certificates_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE;
