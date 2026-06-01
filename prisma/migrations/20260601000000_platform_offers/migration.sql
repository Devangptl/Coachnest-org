-- Platform-wide discount offer system.
-- Adds: OfferScope enum, platform_offers table, platformOfferId +
-- platformOfferDiscount columns on orders and book_orders so each sale
-- snapshots which offer applied and the rupee discount granted.

-- CreateEnum
CREATE TYPE "OfferScope" AS ENUM ('ALL', 'COURSES', 'BOOKS');

-- CreateTable: platform_offers
CREATE TABLE "platform_offers" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" DECIMAL(10, 2) NOT NULL,
    "maxDiscount" DECIMAL(10, 2),
    "minCartValue" DECIMAL(10, 2),
    "scope" "OfferScope" NOT NULL DEFAULT 'ALL',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "bannerEnabled" BOOLEAN NOT NULL DEFAULT true,
    "bannerCtaText" TEXT NOT NULL DEFAULT 'Explore Courses',
    "bannerCtaUrl" TEXT NOT NULL DEFAULT '/courses',
    "bannerBgColor" TEXT NOT NULL DEFAULT '#d97757',
    "bannerTextColor" TEXT NOT NULL DEFAULT '#ffffff',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_offers_isActive_priority_idx" ON "platform_offers"("isActive", "priority");

-- AlterTable: orders → snapshot the auto-applied platform offer
ALTER TABLE "orders"
    ADD COLUMN "platformOfferId" TEXT,
    ADD COLUMN "platformOfferDiscount" DECIMAL(10, 2);

-- AlterTable: book_orders → same snapshot for the books cart flow
ALTER TABLE "book_orders"
    ADD COLUMN "platformOfferId" TEXT,
    ADD COLUMN "platformOfferDiscount" DECIMAL(10, 2);

-- AddForeignKey
ALTER TABLE "orders"
    ADD CONSTRAINT "orders_platformOfferId_fkey"
    FOREIGN KEY ("platformOfferId") REFERENCES "platform_offers"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "book_orders"
    ADD CONSTRAINT "book_orders_platformOfferId_fkey"
    FOREIGN KEY ("platformOfferId") REFERENCES "platform_offers"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
