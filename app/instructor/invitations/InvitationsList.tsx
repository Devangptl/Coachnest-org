"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Check, X, Clock } from "lucide-react";

type Invite = {
  id: string;
  token: string;
  role: string;
  revenueShare: number;
  message: string | null;
  expiresAt: string;
  createdAt: string;
  course: { id: string; title: string; slug: string; thumbnail: string | null };
  invitedBy: { id: string; name: string; avatar: string | null };
};

export default function InvitationsList({
  initialInvites,
  highlightToken,
}: {
  initialInvites: Invite[];
  highlightToken?: string;
}) {
  const router = useRouter();
  const [invites, setInvites] = useState(initialInvites);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(invite: Invite, action: "accept" | "decline") {
    setBusy(invite.id);
    try {
      const res = await fetch(`/api/collaboration/invites/${invite.token}`, {
        method: action === "accept" ? "POST" : "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setInvites((curr) => curr.filter((i) => i.id !== invite.id));
      toast.success(action === "accept" ? "Invitation accepted" : "Invitation declined");
      if (action === "accept" && data.courseId) {
        router.push(`/instructor/courses/${data.courseId}/edit`);
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  if (invites.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 text-center">
        <Clock className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No pending invitations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invites.map((i) => {
        const highlighted = highlightToken === i.token;
        return (
          <div
            key={i.id}
            className={`bg-card border rounded-lg p-5 flex items-start gap-4 ${
              highlighted ? "border-primary/60 ring-1 ring-primary/30" : "border-border"
            }`}
          >
            <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-secondary overflow-hidden">
              {i.course.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.course.thumbnail} alt="" className="w-full h-full object-cover" />
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-foreground truncate">{i.course.title}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Invited by <span className="text-foreground">{i.invitedBy.name}</span> as a{" "}
                <span className="text-foreground">{i.role.replace(/_/g, " ").toLowerCase()}</span> ·
                {" "}{i.revenueShare}% revenue share
              </p>
              {i.message && (
                <p className="mt-2 text-sm text-muted-foreground border-l-2 border-primary/50 pl-3 italic">
                  &ldquo;{i.message}&rdquo;
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Expires {new Date(i.expiresAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={busy === i.id}
                onClick={() => act(i, "accept")}
                className="btn-primary"
              >
                <Check className="w-4 h-4" /> Accept
              </button>
              <button
                type="button"
                disabled={busy === i.id}
                onClick={() => act(i, "decline")}
                className="btn-secondary"
              >
                <X className="w-4 h-4" /> Decline
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
