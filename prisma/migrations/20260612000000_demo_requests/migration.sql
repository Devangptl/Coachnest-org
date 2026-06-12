-- CreateEnum
CREATE TYPE "DemoRequestStatus" AS ENUM ('PENDING', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "demo_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "organization" TEXT NOT NULL,
    "jobTitle" TEXT,
    "teamSize" TEXT,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredDate" TIMESTAMP(3),
    "preferredTimeSlot" TEXT,
    "timezone" TEXT,
    "message" TEXT,
    "source" TEXT,
    "status" "DemoRequestStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3),
    "meetingLink" TEXT,
    "adminNotes" TEXT,
    "handledById" TEXT,
    "contactedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "demo_requests_status_createdAt_idx" ON "demo_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "demo_requests_email_idx" ON "demo_requests"("email");
