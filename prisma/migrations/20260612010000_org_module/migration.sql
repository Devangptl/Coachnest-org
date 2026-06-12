-- Multi-tenant organization module: org roles, status, subscriptions, billing.

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('ORG_ADMIN', 'ORG_INSTRUCTOR', 'ORG_STUDENT');

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "OrgSubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrgTransactionType" AS ENUM ('SUBSCRIPTION', 'RENEWAL', 'UPGRADE', 'DOWNGRADE', 'REFUND');

-- CreateEnum
CREATE TYPE "OrgTransactionStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "OrgRefundStatus" AS ENUM ('PROCESSING', 'PROCESSED', 'FAILED');

-- AlterTable: organizations gain contact + lifecycle status
ALTER TABLE "organizations" ADD COLUMN "email" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "status" "OrgStatus" NOT NULL DEFAULT 'PENDING';

-- Existing organizations predate billing — treat them as active.
UPDATE "organizations" SET "status" = 'ACTIVE';

-- AlterTable: organization_members.role Role -> OrgRole.
-- Hand-written (Prisma's generated enum-type change would drop the data):
-- add new column, map values, swap.
ALTER TABLE "organization_members" ADD COLUMN "role_new" "OrgRole" NOT NULL DEFAULT 'ORG_STUDENT';

UPDATE "organization_members" SET "role_new" = CASE "role"
  WHEN 'ADMIN'      THEN 'ORG_ADMIN'::"OrgRole"
  WHEN 'INSTRUCTOR' THEN 'ORG_INSTRUCTOR'::"OrgRole"
  ELSE 'ORG_STUDENT'::"OrgRole"
END;

ALTER TABLE "organization_members" DROP COLUMN "role";
ALTER TABLE "organization_members" RENAME COLUMN "role_new" TO "role";

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "priceMonthly" DECIMAL(10,2) NOT NULL,
    "priceYearly" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "maxStudents" INTEGER,
    "maxInstructors" INTEGER,
    "maxCourses" INTEGER,
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_subscriptions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "OrgSubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "pendingPlanId" TEXT,
    "pendingBillingCycle" "BillingCycle",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_transactions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "type" "OrgTransactionType" NOT NULL,
    "status" "OrgTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpayRefundId" TEXT,
    "refundAmount" DECIMAL(10,2),
    "refundReason" TEXT,
    "refundStatus" "OrgRefundStatus",
    "refundedAt" TIMESTAMP(3),
    "refundedById" TEXT,
    "paidByUserId" TEXT,
    "notes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_slug_key" ON "subscription_plans"("slug");

-- CreateIndex
CREATE INDEX "organization_subscriptions_organizationId_status_idx" ON "organization_subscriptions"("organizationId", "status");

-- CreateIndex
CREATE INDEX "organization_subscriptions_status_endDate_idx" ON "organization_subscriptions"("status", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "organization_transactions_razorpayOrderId_key" ON "organization_transactions"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_transactions_razorpayRefundId_key" ON "organization_transactions"("razorpayRefundId");

-- CreateIndex
CREATE INDEX "organization_transactions_organizationId_createdAt_idx" ON "organization_transactions"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "organization_transactions_status_type_idx" ON "organization_transactions"("status", "type");

-- CreateIndex
CREATE INDEX "organizations_status_idx" ON "organizations"("status");

-- CreateIndex
CREATE INDEX "organization_members_organizationId_role_idx" ON "organization_members"("organizationId", "role");

-- CreateIndex
CREATE INDEX "courses_organizationId_status_idx" ON "courses"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_transactions" ADD CONSTRAINT "organization_transactions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_transactions" ADD CONSTRAINT "organization_transactions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "organization_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
