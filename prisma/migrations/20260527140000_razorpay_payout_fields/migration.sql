-- Migration: razorpay_payout_fields
-- Adds RazorpayX payout tracking columns to payout_requests table.

ALTER TABLE "payout_requests"
  ADD COLUMN IF NOT EXISTS "razorpayContactId"     TEXT,
  ADD COLUMN IF NOT EXISTS "razorpayFundAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "razorpayPayoutId"      TEXT,
  ADD COLUMN IF NOT EXISTS "razorpayPayoutStatus"  TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "payout_requests_razorpayPayoutId_key"
  ON "payout_requests"("razorpayPayoutId");
