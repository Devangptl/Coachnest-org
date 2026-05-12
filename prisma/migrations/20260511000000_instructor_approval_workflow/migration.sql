-- CreateEnum
CREATE TYPE "InstructorStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "instructorAppliedAt" TIMESTAMP(3),
ADD COLUMN     "instructorRejectReason" TEXT,
ADD COLUMN     "instructorReviewedAt" TIMESTAMP(3),
ADD COLUMN     "instructorStatus" "InstructorStatus";
