-- Migration: remove_stripe_fields
-- Removes all Stripe-specific columns from User, Order, BookOrder, and RefundRequest.
-- Razorpay columns (razorpayOrderId, razorpayPaymentId, razorpayRefundId) are kept.

-- ── User ──────────────────────────────────────────────────────────────────────
ALTER TABLE "users" DROP COLUMN IF EXISTS "stripeCustomerId";

-- ── Order ─────────────────────────────────────────────────────────────────────
ALTER TABLE "orders" DROP COLUMN IF EXISTS "stripeSessionId";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "stripePaymentId";

-- ── BookOrder ─────────────────────────────────────────────────────────────────
ALTER TABLE "book_orders" DROP COLUMN IF EXISTS "stripeSessionId";
ALTER TABLE "book_orders" DROP COLUMN IF EXISTS "stripePaymentId";

-- ── RefundRequest ─────────────────────────────────────────────────────────────
ALTER TABLE "refund_requests" DROP COLUMN IF EXISTS "stripeRefundId";
