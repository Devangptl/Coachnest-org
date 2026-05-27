-- Razorpay payment gateway integration
-- Adds Razorpay-specific fields to orders, book_orders, and refund_requests.
-- All changes are ADDITIVE — existing Stripe columns are kept intact so that
-- subscription-billing code (which still uses Stripe) continues to work.
--
-- New fields:
--   orders.razorpayOrderId     — Razorpay order ID returned by POST /v1/orders
--   orders.razorpayPaymentId   — Razorpay payment ID returned after checkout
--   book_orders.razorpayOrderId
--   book_orders.razorpayPaymentId
--   refund_requests.razorpayRefundId — Razorpay refund ID set when a refund is processed

-- AlterTable: orders
ALTER TABLE "orders"
    ADD COLUMN "razorpayOrderId"   TEXT,
    ADD COLUMN "razorpayPaymentId" TEXT;

CREATE UNIQUE INDEX "orders_razorpayOrderId_key"   ON "orders"("razorpayOrderId");
CREATE UNIQUE INDEX "orders_razorpayPaymentId_key" ON "orders"("razorpayPaymentId");

-- AlterTable: book_orders
ALTER TABLE "book_orders"
    ADD COLUMN "razorpayOrderId"   TEXT,
    ADD COLUMN "razorpayPaymentId" TEXT;

CREATE UNIQUE INDEX "book_orders_razorpayOrderId_key"   ON "book_orders"("razorpayOrderId");
CREATE UNIQUE INDEX "book_orders_razorpayPaymentId_key" ON "book_orders"("razorpayPaymentId");

-- AlterTable: refund_requests
ALTER TABLE "refund_requests"
    ADD COLUMN "razorpayRefundId" TEXT;

CREATE UNIQUE INDEX "refund_requests_razorpayRefundId_key" ON "refund_requests"("razorpayRefundId");
