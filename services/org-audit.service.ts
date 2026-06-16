import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export interface AuditEntry {
  organizationId: string;
  actorUserId: string;
  actorName: string;
  action: string;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Record an audit entry. Best-effort: failures are logged but never thrown,
 * so auditing can never break the action it is recording.
 */
export async function logOrgAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.orgAuditLog.create({
      data: {
        organizationId: entry.organizationId,
        actorUserId: entry.actorUserId,
        actorName: entry.actorName,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        targetLabel: entry.targetLabel ?? null,
        metadata: entry.metadata,
      },
    });
  } catch (err) {
    console.error("[logOrgAudit]", err);
  }
}

export async function listOrgAuditLogs(
  organizationId: string,
  opts?: { action?: string; limit?: number },
) {
  return prisma.orgAuditLog.findMany({
    where: {
      organizationId,
      ...(opts?.action ? { action: opts.action } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(opts?.limit ?? 100, 200),
  });
}
