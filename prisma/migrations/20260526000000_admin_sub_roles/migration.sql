-- CreateEnum
CREATE TYPE "AdminSubRole" AS ENUM ('SUPER_ADMIN', 'CONTENT_ADMIN', 'USER_ADMIN', 'FINANCE_ADMIN', 'SUPPORT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "adminSubRole" "AdminSubRole";

-- Backfill: every existing ADMIN gets SUPER_ADMIN so nothing breaks.
UPDATE "User" SET "adminSubRole" = 'SUPER_ADMIN' WHERE "role" = 'ADMIN' AND "adminSubRole" IS NULL;
