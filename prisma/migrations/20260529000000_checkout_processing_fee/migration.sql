-- Add a processing fee column to orders and book orders.
-- The fee is added on top of the post-discount goods total and is already
-- included in the `amount` charged via Razorpay.

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "processingFee" DECIMAL(10, 2);

ALTER TABLE "book_orders"
  ADD COLUMN IF NOT EXISTS "processingFee" DECIMAL(10, 2);
