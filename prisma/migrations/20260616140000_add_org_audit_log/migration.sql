-- Append-only audit log of significant org admin actions.
CREATE TABLE "org_audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "targetLabel" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "org_audit_logs_organizationId_createdAt_idx"
    ON "org_audit_logs"("organizationId", "createdAt");

ALTER TABLE "org_audit_logs"
    ADD CONSTRAINT "org_audit_logs_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
