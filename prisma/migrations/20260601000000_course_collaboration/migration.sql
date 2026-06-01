-- CreateEnum
CREATE TYPE "CourseCollaboratorRole" AS ENUM ('OWNER', 'CO_INSTRUCTOR', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "CollaborationInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "course_collaborators" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CourseCollaboratorRole" NOT NULL DEFAULT 'CO_INSTRUCTOR',
    "revenueShare" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "addedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_collaborators_courseId_userId_key" ON "course_collaborators"("courseId", "userId");

-- CreateIndex
CREATE INDEX "course_collaborators_userId_idx" ON "course_collaborators"("userId");

-- CreateIndex
CREATE INDEX "course_collaborators_courseId_role_idx" ON "course_collaborators"("courseId", "role");

-- CreateTable
CREATE TABLE "course_collaboration_invites" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" "CourseCollaboratorRole" NOT NULL DEFAULT 'CO_INSTRUCTOR',
    "revenueShare" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "invitedById" TEXT NOT NULL,
    "status" "CollaborationInviteStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_collaboration_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_collaboration_invites_token_key" ON "course_collaboration_invites"("token");

-- CreateIndex
CREATE INDEX "course_collaboration_invites_courseId_status_idx" ON "course_collaboration_invites"("courseId", "status");

-- CreateIndex
CREATE INDEX "course_collaboration_invites_email_status_idx" ON "course_collaboration_invites"("email", "status");

-- CreateTable
CREATE TABLE "course_activity_logs" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_activity_logs_courseId_createdAt_idx" ON "course_activity_logs"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "course_activity_logs_userId_idx" ON "course_activity_logs"("userId");

-- AddForeignKey
ALTER TABLE "course_collaborators" ADD CONSTRAINT "course_collaborators_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_collaborators" ADD CONSTRAINT "course_collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_collaborators" ADD CONSTRAINT "course_collaborators_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_collaboration_invites" ADD CONSTRAINT "course_collaboration_invites_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_collaboration_invites" ADD CONSTRAINT "course_collaboration_invites_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_activity_logs" ADD CONSTRAINT "course_activity_logs_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_activity_logs" ADD CONSTRAINT "course_activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
