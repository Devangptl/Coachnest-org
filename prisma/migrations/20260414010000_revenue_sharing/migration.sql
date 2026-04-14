-- CreateEnum: SaleSource
CREATE TYPE "SaleSource" AS ENUM ('ORGANIC', 'REFERRAL', 'COUPON', 'ADS');

-- CreateEnum: PayoutStatus
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED');

-- AlterTable: orders — add revenue tracking columns
ALTER TABLE "orders"
  ADD COLUMN "saleSource"        "SaleSource" NOT NULL DEFAULT 'ORGANIC',
  ADD COLUMN "instructorPercent" DECIMAL(5,2),
  ADD COLUMN "referralLinkId"    TEXT;

-- AlterTable: coupons — track who created the coupon (instructor ownership)
ALTER TABLE "coupons"
  ADD COLUMN "createdById" TEXT;

-- CreateTable: referral_links
CREATE TABLE "referral_links" (
    "id"           TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "code"         TEXT NOT NULL,
    "courseId"     TEXT,
    "label"        TEXT,
    "totalClicks"  INTEGER NOT NULL DEFAULT 0,
    "conversions"  INTEGER NOT NULL DEFAULT 0,
    "isActive"     BOOLEAN NOT NULL DEFAULT true,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_links_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "referral_links_code_key" ON "referral_links"("code");

-- CreateTable: instructor_wallets
CREATE TABLE "instructor_wallets" (
    "id"             TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "balance"        DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalEarned"    DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalWithdrawn" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instructor_wallets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "instructor_wallets_userId_key" ON "instructor_wallets"("userId");

-- CreateTable: wallet_transactions
CREATE TABLE "wallet_transactions" (
    "id"          TEXT NOT NULL,
    "walletId"    TEXT NOT NULL,
    "orderId"     TEXT,
    "amount"      DECIMAL(12,2) NOT NULL,
    "type"        TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "meta"        JSONB,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payout_requests
CREATE TABLE "payout_requests" (
    "id"           TEXT NOT NULL,
    "walletId"     TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "amount"       DECIMAL(12,2) NOT NULL,
    "currency"     TEXT NOT NULL DEFAULT 'INR',
    "status"       "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "bankDetails"  JSONB,
    "notes"        TEXT,
    "adminNotes"   TEXT,
    "requestedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt"  TIMESTAMP(3),

    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: referral_links
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_instructorId_fkey"
    FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: orders → referral_links
ALTER TABLE "orders" ADD CONSTRAINT "orders_referralLinkId_fkey"
    FOREIGN KEY ("referralLinkId") REFERENCES "referral_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: instructor_wallets
ALTER TABLE "instructor_wallets" ADD CONSTRAINT "instructor_wallets_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: wallet_transactions
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletId_fkey"
    FOREIGN KEY ("walletId") REFERENCES "instructor_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: payout_requests
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_walletId_fkey"
    FOREIGN KEY ("walletId") REFERENCES "instructor_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_instructorId_fkey"
    FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
