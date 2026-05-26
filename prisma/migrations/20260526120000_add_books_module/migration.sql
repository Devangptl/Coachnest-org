-- Books / Documents module
-- Adds: BookFileFormat enum, Book, Cart, CartItem, BookOrder, BookOrderItem,
-- BookPurchase, BookReview, BookWishlist. Also extends Coupon (bookId) and
-- MediaAsset (kind) for the new content type.

-- CreateEnum
CREATE TYPE "BookFileFormat" AS ENUM ('PDF', 'EPUB', 'DOCX');

-- AlterTable: coupons → add optional bookId for book-scoped coupons
ALTER TABLE "coupons" ADD COLUMN "bookId" TEXT;

-- AlterTable: media_assets → add kind discriminator for image | document | video
ALTER TABLE "media_assets" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'image';

-- CreateIndex
CREATE INDEX "media_assets_userId_kind_idx" ON "media_assets"("userId", "kind");

-- CreateTable: books
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shortDesc" TEXT,
    "coverImage" TEXT,
    "previewVideo" TEXT,
    "author" TEXT NOT NULL,
    "pageCount" INTEGER,
    "language" TEXT NOT NULL DEFAULT 'English',
    "fileFormat" "BookFileFormat" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "filePublicId" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "price" DECIMAL(10,2),
    "discountPrice" DECIMAL(10,2),
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "instructorRevenuePercent" INTEGER NOT NULL DEFAULT 70,
    "categoryId" TEXT,
    "createdById" TEXT NOT NULL,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "books_slug_key" ON "books"("slug");
CREATE INDEX "books_status_createdAt_idx" ON "books"("status", "createdAt");
CREATE INDEX "books_categoryId_status_idx" ON "books"("categoryId", "status");
CREATE INDEX "books_createdById_idx" ON "books"("createdById");

ALTER TABLE "books" ADD CONSTRAINT "books_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "books" ADD CONSTRAINT "books_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "books" ADD CONSTRAINT "books_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: carts
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "carts_userId_key" ON "carts"("userId");

ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: cart_items
CREATE TABLE "cart_items" (
    "cartId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("cartId", "bookId")
);

CREATE INDEX "cart_items_bookId_idx" ON "cart_items"("bookId");

ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: book_orders
CREATE TABLE "book_orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "stripeSessionId" TEXT,
    "stripePaymentId" TEXT,
    "couponId" TEXT,
    "discountAmount" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "book_orders_stripeSessionId_key" ON "book_orders"("stripeSessionId");
CREATE UNIQUE INDEX "book_orders_stripePaymentId_key" ON "book_orders"("stripePaymentId");
CREATE INDEX "book_orders_userId_status_idx" ON "book_orders"("userId", "status");

ALTER TABLE "book_orders" ADD CONSTRAINT "book_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "book_orders" ADD CONSTRAINT "book_orders_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: book_order_items
CREATE TABLE "book_order_items" (
    "id" TEXT NOT NULL,
    "bookOrderId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "instructorRevenue" DECIMAL(10,2) NOT NULL,
    "platformRevenue" DECIMAL(10,2) NOT NULL,
    "instructorPercent" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "book_order_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "book_order_items_bookOrderId_bookId_key" ON "book_order_items"("bookOrderId", "bookId");
CREATE INDEX "book_order_items_bookId_idx" ON "book_order_items"("bookId");

ALTER TABLE "book_order_items" ADD CONSTRAINT "book_order_items_bookOrderId_fkey" FOREIGN KEY ("bookOrderId") REFERENCES "book_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "book_order_items" ADD CONSTRAINT "book_order_items_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: book_purchases
CREATE TABLE "book_purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_purchases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "book_purchases_orderItemId_key" ON "book_purchases"("orderItemId");
CREATE UNIQUE INDEX "book_purchases_userId_bookId_key" ON "book_purchases"("userId", "bookId");
CREATE INDEX "book_purchases_userId_purchasedAt_idx" ON "book_purchases"("userId", "purchasedAt");

ALTER TABLE "book_purchases" ADD CONSTRAINT "book_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "book_purchases" ADD CONSTRAINT "book_purchases_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "book_purchases" ADD CONSTRAINT "book_purchases_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "book_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: book_reviews
CREATE TABLE "book_reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "book_reviews_userId_bookId_key" ON "book_reviews"("userId", "bookId");
CREATE INDEX "book_reviews_bookId_createdAt_idx" ON "book_reviews"("bookId", "createdAt");

ALTER TABLE "book_reviews" ADD CONSTRAINT "book_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "book_reviews" ADD CONSTRAINT "book_reviews_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: book_wishlists
CREATE TABLE "book_wishlists" (
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_wishlists_pkey" PRIMARY KEY ("userId", "bookId")
);

CREATE INDEX "book_wishlists_bookId_idx" ON "book_wishlists"("bookId");

ALTER TABLE "book_wishlists" ADD CONSTRAINT "book_wishlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "book_wishlists" ADD CONSTRAINT "book_wishlists_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
