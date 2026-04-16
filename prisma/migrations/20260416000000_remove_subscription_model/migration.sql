-- DropTable: subscriptions
DROP TABLE "subscriptions";

-- AlterTable: courses — remove subscription-tier gating column
ALTER TABLE "courses" DROP COLUMN "min_plan";

-- DropEnum: SubStatus (was only used by subscriptions table)
DROP TYPE "SubStatus";
