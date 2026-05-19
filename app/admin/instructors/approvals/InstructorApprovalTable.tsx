"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Avatar from "@/components/Avatar";
import { formatDate } from "@/lib/utils";

interface Application {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  headline: string | null;
  bio: string | null;
  instructorStatus: "PENDING" | "APPROVED" | "REJECTED";
  instructorAppliedAt: string | null;
  instructorReviewedAt: string | null;
  instructorRejectReason: string | null;
}

function StatusBadge({ status }: { status: Application["instructorStatus"] }) {
  if (status === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/25 text-emerald-400">
        <CheckCircle2 className="w-3 h-3" /> Approved
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/10 border border-red-400/25 text-red-400">
        <XCircle className="w-3 h-3" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-400/25 text-amber-400">
      <Clock className="w-3 h-3" /> Pending
    </span>
  );
}

function ApprovalRow({ app }: { app: Application }) {
  const router = useRouter();
  const [expanded, setExpanded]     = useState(false);
  const [reason,   setReason]       = useState("");
  const [loading,  setLoading]      = useState<"approve" | "reject" | null>(null);
  const [error,    setError]        = useState<string | null>(null);

  async function handleAction(action: "approve" | "reject") {
    setError(null);
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/instructor-approvals/${app.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, reason: reason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed."); return; }
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="border-b border-border/50 last:border-0">
      <div className="flex items-center gap-4 px-4 py-3.5">
        {/* Avatar */}
        <Avatar
          name={app.name}
          avatar={app.avatar}
          seed={app.id}
          size="w-10 h-10"
          className="flex-shrink-0"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{app.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
            <Mail className="w-3 h-3 flex-shrink-0" />{app.email}
          </p>
          {app.headline && (
            <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{app.headline}</p>
          )}
        </div>

        {/* Applied date */}
        <div className="hidden sm:block text-right flex-shrink-0">
          <p className="text-xs text-muted-foreground/60">Applied</p>
          <p className="text-xs text-muted-foreground">
            {app.instructorAppliedAt ? formatDate(new Date(app.instructorAppliedAt)) : "—"}
          </p>
        </div>

        {/* Status */}
        <div className="flex-shrink-0">
          <StatusBadge status={app.instructorStatus} />
        </div>

        {/* Expand toggle */}
        {app.instructorStatus === "PENDING" && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Expanded action panel */}
      {expanded && app.instructorStatus === "PENDING" && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3 bg-secondary/20">
          {app.bio && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Bio</p>
              <p className="text-sm text-muted-foreground/80 leading-relaxed line-clamp-3">{app.bio}</p>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Rejection reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a reason if rejecting…"
              rows={2}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-orange-500/40 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleAction("approve")}
              disabled={loading !== null}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {loading === "approve" ? "Approving…" : "Approve"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction("reject")}
              disabled={loading !== null}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <XCircle className="w-3.5 h-3.5" />
              {loading === "reject" ? "Rejecting…" : "Reject"}
            </Button>
          </div>
        </div>
      )}

      {/* Rejection reason display */}
      {app.instructorStatus === "REJECTED" && app.instructorRejectReason && (
        <div className="px-4 pb-3 pt-0">
          <p className="text-xs text-muted-foreground/60 italic">
            Reason: {app.instructorRejectReason}
          </p>
        </div>
      )}
    </div>
  );
}

export default function InstructorApprovalTable({
  applications,
}: {
  applications: Application[];
}) {
  return (
    <div className="divide-y divide-border/30">
      {applications.map((app) => (
        <ApprovalRow key={app.id} app={app} />
      ))}
    </div>
  );
}
