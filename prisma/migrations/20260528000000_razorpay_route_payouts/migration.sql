-- Switch payout tracking from RazorpayX to Razorpay Route.
-- Drops the four RazorpayX columns and adds three Route columns.

ALTER TABLE "payout_requests"
  DROP COLUMN IF EXISTS "razorpayContactId",
  DROP COLUMN IF EXISTS "razorpayFundAccountId",
  DROP COLUMN IF EXISTS "razorpayPayoutId",
  DROP COLUMN IF EXISTS "razorpayPayoutStatus",
  ADD COLUMN IF NOT EXISTS "razorpayLinkedAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "razorpayTransferId"      TEXT,
  ADD COLUMN IF NOT EXISTS "razorpayTransferStatus"  TEXT;

DROP INDEX IF EXISTS "payout_requests_razorpayPayoutId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "payout_requests_razorpayTransferId_key"
  ON "payout_requests"("razorpayTransferId");
