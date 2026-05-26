-- CreateEnum
CREATE TYPE "AdminSubRole" AS ENUM ('SUPER_ADMIN', 'CONTENT_ADMIN', 'USER_ADMIN', 'FINANCE_ADMIN', 'SUPPORT');

-- AlterTable
-- Note: the Prisma "User" model maps to the "users" table via @@map.
ALTER TABLE "users" ADD COLUMN "adminSubRole" "AdminSubRole";

-- Backfill: every existing ADMIN gets SUPER_ADMIN so nothing breaks.
UPDATE "users" SET "adminSubRole" = 'SUPER_ADMIN' WHERE "role" = 'ADMIN' AND "adminSubRole" IS NULL;
