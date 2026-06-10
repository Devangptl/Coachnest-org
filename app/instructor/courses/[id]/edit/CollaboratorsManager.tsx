"use client";

/**
 * CollaboratorsManager — instructor course settings tab that lists current
 * collaborators, lets owners invite new ones with a role + revenue share,
 * edit their settings, revoke pending invites, and view the activity log.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Mail,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  ShieldCheck,
  History,
  X,
} from "lucide-react";

type Role = "OWNER" | "CO_INSTRUCTOR" | "EDITOR" | "VIEWER";

type Collaborator = {
  id: string;
  userId: string;
  role: Role;
  revenueShare: number;
  isPublic: boolean;
  acceptedAt: string | null;
  user: { id: string; name: string; email: string; avatar: string | null; headline: string | null };
};

type Invite = {
  id: string;
  email: string;
  role: Role;
  revenueShare: number;
  expiresAt: string;
  createdAt: string;
};

type ActivityEvent = {
  id: string;
  action: string;
  meta: unknown;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null; email: string };
};

const ROLE_OPTIONS: { value: Exclude<Role, "OWNER">; label: string; description: string }[] = [
  {
    value: "CO_INSTRUCTOR",
    label: "Co-Instructor",
    description: "Full edit access, listed publicly, eligible for revenue share.",
  },
  {
    value: "EDITOR",
    label: "Editor",
    description: "Can edit content (lessons, quizzes), not listed publicly.",
  },
  {
    value: "VIEWER",
    label: "Viewer",
    description: "Read-only access to course internals.",
  },
];

const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Owner",
  CO_INSTRUCTOR: "Co-Instructor",
  EDITOR: "Editor",
  VIEWER: "Viewer",
};

const ROLE_BADGE: Record<Role, string> = {
  OWNER: "badge-orange",
  CO_INSTRUCTOR: "badge-amber",
  EDITOR: "badge-purple",
  VIEWER: "badge bg-secondary text-muted-foreground border border-border",
};

function formatAction(action: string) {
  return action
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CollaboratorsManager({ courseId }: { courseId: string }) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [revenueShareTotal, setRevenueShareTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Exclude<Role, "OWNER">>("CO_INSTRUCTOR");
  const [inviteShare, setInviteShare] = useState(0);
  const [inviteMessage, setInviteMessage] = useState("");
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ role: Role; revenueShare: number; isPublic: boolean } | null>(null);

  async function refresh() {
    const [colRes, actRes] = await Promise.all([
      fetch(`/api/courses/${courseId}/collaborators`, { cache: "no-store" }),
      fetch(`/api/courses/${courseId}/activity?limit=50`, { cache: "no-store" }).catch(() => null),
    ]);
    if (colRes.ok) {
      const data = await colRes.json();
      setCollaborators(data.collaborators);
      setPendingInvites(data.pendingInvites);
      setCanManage(data.canManage);
      setRevenueShareTotal(data.revenueShareTotal);
    }
    if (actRes?.ok) {
      const data = await actRes.json();
      setActivity(data.events);
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [courseId]);

  const ownerShare = useMemo(
    () => Math.max(0, 100 - revenueShareTotal),
    [revenueShareTotal],
  );

  async function submitInvite() {
    if (!inviteEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    setSubmittingInvite(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/collaborators`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          revenueShare: Number(inviteShare),
          message: inviteMessage.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send invite");
      toast.success("Invitation sent");
      setShowInvite(false);
      setInviteEmail("");
      setInviteShare(0);
      setInviteMessage("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setSubmittingInvite(false);
    }
  }

  async function saveCollaborator(c: Collaborator) {
    if (!draft) return;
    try {
      const res = await fetch(`/api/courses/${courseId}/collaborators/${c.userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      toast.success("Collaborator updated");
      setEditingId(null);
      setDraft(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function removeCollaborator(c: Collaborator) {
    if (!confirm(`Remove ${c.user.name} from this course? Their access will be revoked.`)) return;
    try {
      const res = await fetch(`/api/courses/${courseId}/collaborators/${c.userId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to remove");
      toast.success("Collaborator removed");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    }
  }

  async function revokeInvite(invite: Invite) {
    if (!confirm(`Revoke pending invite to ${invite.email}?`)) return;
    try {
      const res = await fetch(`/api/courses/${courseId}/collaborators/invite:${invite.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to revoke invite");
      }
      toast.success("Invite revoked");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke invite");
    }
  }

  if (loading) {
    return <div className="text-muted-foreground text-sm">Loading collaborators…</div>;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Course Collaborators</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Invite other instructors to co-teach this course. Revenue is split based on each
            collaborator&apos;s configured share — the owner&apos;s share is automatic.
          </p>
        </div>
        {canManage && (
          <button type="button" onClick={() => setShowInvite(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Invite Collaborator
          </button>
        )}
      </header>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-secondary/40 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Owner share: <span className="text-foreground font-semibold">{ownerShare}%</span> ·
            {" "}Allocated to collaborators: <span className="text-foreground font-semibold">{revenueShareTotal}%</span>
          </p>
          <ShieldCheck className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-5 py-2">User</th>
              <th className="text-left font-medium px-5 py-2">Role</th>
              <th className="text-right font-medium px-5 py-2">Revenue Share</th>
              <th className="text-center font-medium px-5 py-2">Public</th>
              <th className="text-right font-medium px-5 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {collaborators.map((c) => {
              const isOwner = c.role === "OWNER";
              const isEditing = editingId === c.id;
              return (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {c.user.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs text-muted-foreground">
                          {c.user.name.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-foreground font-medium truncate">{c.user.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{c.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {isEditing && !isOwner ? (
                      <select
                        value={draft?.role ?? c.role}
                        onChange={(e) =>
                          setDraft((d) => ({
                            role: e.target.value as Role,
                            revenueShare: d?.revenueShare ?? c.revenueShare,
                            isPublic: d?.isPublic ?? c.isPublic,
                          }))
                        }
                        className="bg-secondary border border-border text-foreground text-sm rounded px-2 py-1"
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={ROLE_BADGE[c.role]}>
                        {ROLE_LABEL[c.role]}
                      </span>
                    )}
                    {!c.acceptedAt && !isOwner && (
                      <span className="badge-amber ml-2">Pending</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-foreground">
                    {isEditing && !isOwner ? (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={draft?.revenueShare ?? c.revenueShare}
                        onChange={(e) =>
                          setDraft((d) => ({
                            role: d?.role ?? c.role,
                            revenueShare: Number(e.target.value),
                            isPublic: d?.isPublic ?? c.isPublic,
                          }))
                        }
                        className="w-20 bg-secondary border border-border text-foreground text-sm rounded px-2 py-1 text-right"
                      />
                    ) : (
                      `${isOwner ? ownerShare : c.revenueShare}%`
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {isEditing && !isOwner ? (
                      <input
                        type="checkbox"
                        checked={draft?.isPublic ?? c.isPublic}
                        onChange={(e) =>
                          setDraft((d) => ({
                            role: d?.role ?? c.role,
                            revenueShare: d?.revenueShare ?? c.revenueShare,
                            isPublic: e.target.checked,
                          }))
                        }
                      />
                    ) : c.isPublic ? (
                      <span className="text-primary text-xs font-semibold">Yes</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">No</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {isOwner ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : canManage ? (
                      isEditing ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button type="button" onClick={() => saveCollaborator(c)} className="btn-primary">
                            <Save className="w-3.5 h-3.5" /> Save
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingId(null); setDraft(null); }}
                            className="btn-ghost"
                          >
                            <X className="w-3.5 h-3.5" /> Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(c.id);
                              setDraft({
                                role: c.role,
                                revenueShare: c.revenueShare,
                                isPublic: c.isPublic,
                              });
                            }}
                            className="btn-ghost"
                          >
                            Edit
                          </button>
                          <button type="button" onClick={() => removeCollaborator(c)} className="btn-danger">
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        </div>
                      )
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {pendingInvites.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Mail className="w-4 h-4" /> Pending Invites
          </h3>
          <div className="bg-card border border-border rounded-lg divide-y divide-border">
            {pendingInvites.map((i) => (
              <div key={i.id} className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="text-foreground text-sm">{i.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {ROLE_LABEL[i.role]} · {i.revenueShare}% revenue share · expires{" "}
                    {new Date(i.expiresAt).toLocaleDateString()}
                  </div>
                </div>
                {canManage && (
                  <button type="button" onClick={() => revokeInvite(i)} className="btn-danger">
                    <RotateCcw className="w-3.5 h-3.5" /> Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <History className="w-4 h-4" /> Recent Activity
        </h3>
        {activity.length === 0 ? (
          <p className="text-xs text-muted-foreground">No activity yet.</p>
        ) : (
          <div className="bg-card border border-border rounded-lg max-h-96 overflow-y-auto">
            {activity.map((e) => (
              <div key={e.id} className="px-5 py-2.5 border-b border-border last:border-b-0">
                <div className="text-sm text-foreground">
                  <span className="font-medium">{e.user.name}</span>{" "}
                  <span className="text-muted-foreground">— {formatAction(e.action)}</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {new Date(e.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showInvite && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Invite Collaborator</h3>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="collaborator@example.com"
                  className="mt-1 w-full bg-secondary border border-border text-foreground rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Role</label>
                <div className="mt-1 space-y-1.5">
                  {ROLE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-2 p-2.5 rounded border cursor-pointer transition-colors ${
                        inviteRole === opt.value
                          ? "border-primary/60 bg-primary/5"
                          : "border-border hover:bg-secondary/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        checked={inviteRole === opt.value}
                        onChange={() => setInviteRole(opt.value)}
                        className="mt-1"
                      />
                      <div>
                        <div className="text-sm font-medium text-foreground">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Revenue Share (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100 - revenueShareTotal}
                  value={inviteShare}
                  onChange={(e) => setInviteShare(Number(e.target.value))}
                  className="mt-1 w-full bg-secondary border border-border text-foreground rounded px-3 py-2 text-sm"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Up to {100 - revenueShareTotal}% available. Owner keeps {ownerShare - Number(inviteShare || 0)}%.
                </p>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Message (optional)
                </label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={2}
                  className="mt-1 w-full bg-secondary border border-border text-foreground rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowInvite(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="button" disabled={submittingInvite} onClick={submitInvite} className="btn-primary">
                {submittingInvite ? "Sending…" : "Send Invitation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
