-- CreateEnum
CREATE TYPE "EmailLogStatus" AS ENUM ('SENT', 'FAILED', 'PENDING');

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "description" TEXT,
    "variables" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "templateId" TEXT,
    "templateName" TEXT,
    "status" "EmailLogStatus" NOT NULL DEFAULT 'SENT',
    "resendId" TEXT,
    "error" TEXT,
    "meta" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_slug_key" ON "email_templates"("slug");

-- CreateIndex
CREATE INDEX "email_logs_templateId_idx" ON "email_logs"("templateId");

-- CreateIndex
CREATE INDEX "email_logs_status_idx" ON "email_logs"("status");

-- CreateIndex
CREATE INDEX "email_logs_sentAt_idx" ON "email_logs"("sentAt");

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
