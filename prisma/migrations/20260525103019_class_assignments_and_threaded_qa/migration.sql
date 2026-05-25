-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('TEXT', 'FILE', 'URL', 'QUIZ');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'GRADED', 'RETURNED');

-- AlterTable
ALTER TABLE "class_discussions" ADD COLUMN     "acceptedReplyId" TEXT,
ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "class_discussion_votes" (
    "discussionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_discussion_votes_pkey" PRIMARY KEY ("discussionId","userId")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "type" "AssignmentType" NOT NULL DEFAULT 'TEXT',
    "status" "AssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "passingScore" INTEGER NOT NULL DEFAULT 60,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "dueAt" TIMESTAMP(3),
    "publishAt" TIMESTAMP(3),
    "quizId" TEXT,
    "allowLate" BOOLEAN NOT NULL DEFAULT true,
    "latePenalty" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_submissions" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "textBody" TEXT,
    "fileUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "url" TEXT,
    "submittedAt" TIMESTAMP(3),
    "score" INTEGER,
    "feedback" TEXT,
    "graderId" TEXT,
    "gradedAt" TIMESTAMP(3),
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_discussion_votes_userId_idx" ON "class_discussion_votes"("userId");

-- CreateIndex
CREATE INDEX "assignments_classId_status_idx" ON "assignments"("classId", "status");

-- CreateIndex
CREATE INDEX "assignments_classId_dueAt_idx" ON "assignments"("classId", "dueAt");

-- CreateIndex
CREATE INDEX "assignment_submissions_assignmentId_status_idx" ON "assignment_submissions"("assignmentId", "status");

-- CreateIndex
CREATE INDEX "assignment_submissions_studentId_idx" ON "assignment_submissions"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_submissions_assignmentId_studentId_attempt_key" ON "assignment_submissions"("assignmentId", "studentId", "attempt");

-- CreateIndex
CREATE UNIQUE INDEX "class_discussions_acceptedReplyId_key" ON "class_discussions"("acceptedReplyId");

-- CreateIndex
CREATE INDEX "class_discussions_classId_pinned_createdAt_idx" ON "class_discussions"("classId", "pinned", "createdAt");

-- AddForeignKey
ALTER TABLE "class_discussions" ADD CONSTRAINT "class_discussions_acceptedReplyId_fkey" FOREIGN KEY ("acceptedReplyId") REFERENCES "class_discussions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_discussion_votes" ADD CONSTRAINT "class_discussion_votes_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "class_discussions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_discussion_votes" ADD CONSTRAINT "class_discussion_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_graderId_fkey" FOREIGN KEY ("graderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

