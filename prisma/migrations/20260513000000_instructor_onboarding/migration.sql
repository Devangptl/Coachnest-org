-- AlterTable: add instructor onboarding flag and teaching topics to users
ALTER TABLE "users"
  ADD COLUMN "hasCompletedInstructorOnboarding" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "teachingTopics" TEXT[] DEFAULT ARRAY[]::TEXT[];
