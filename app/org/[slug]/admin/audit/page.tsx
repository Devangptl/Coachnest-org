import { requireOrgPermission } from "@/lib/org-auth";
import { listOrgAuditLogs } from "@/services/org-audit.service";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  "member.invite": "Invited member",
  "member.bulk_invite": "Bulk-invited members",
  "member.role_change": "Changed role",
  "member.remove": "Removed member",
  "member.transfer_ownership": "Transferred ownership",
  "course.create": "Created course",
  "course.update": "Updated course",
  "course.delete": "Deleted course",
};

function describe(log: {
  action: string;
  targetLabel: string | null;
  metadata: unknown;
}): string {
  const meta = (log.metadata ?? {}) as Record<string, unknown>;
  if (log.action === "member.role_change" && meta.from && meta.to) {
    return `${log.targetLabel ?? "member"}: ${String(meta.from)} → ${String(meta.to)}`;
  }
  if (log.action === "member.bulk_invite") {
    return `${meta.added ?? 0} of ${meta.total ?? 0} invited`;
  }
  if (log.action === "member.invite" && meta.role) {
    return `${log.targetLabel ?? "member"} as ${String(meta.role)}`;
  }
  return log.targetLabel ?? "";
}

export default async function OrgAuditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrgPermission(slug, "reports:view", { allowExpired: true });
  const logs = await listOrgAuditLogs(ctx.org.id, { limit: 150 });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Activity log</h1>
        <p className="text-muted-foreground mt-1">
          Recent administrative actions in your organization.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {logs.length === 0 ? (
          <p className="px-5 py-10 text-sm text-muted-foreground text-center">
            No activity recorded yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log) => (
              <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{log.actorName}</span>{" "}
                    <span className="text-muted-foreground">
                      {ACTION_LABEL[log.action] ?? log.action}
                    </span>
                  </p>
                  {describe(log) && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{describe(log)}</p>
                  )}
                </div>
                <time className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString("en-IN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
