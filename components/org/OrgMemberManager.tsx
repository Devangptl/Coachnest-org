"use client";

/**
 * OrgMemberManager — unified member management for the org admin portal.
 * Lists every member regardless of role and lets an authorized actor invite,
 * re-role, and remove members. Role controls are gated client-side by the
 * same RBAC hierarchy the API enforces (lib/org-permissions); the server is
 * still authoritative.
 */
import { useCallback, useEffect, useMemo, useState, FormEvent } from "react";
import toast from "react-hot-toast";
import { Loader2, Plus, Trash2, Search, X } from "lucide-react";
import Avatar from "@/components/Avatar";
import {
  ORG_ROLES,
  ORG_ROLE_LABEL,
  assignableRoles,
  canManageMember,
} from "@/lib/org-permissions";
import type { OrgRole } from "@/lib/generated/prisma/client";

interface Member {
  userId: string;
  role: OrgRole;
  joinedAt: string;
  user: { id: string; name: string; email: string; avatar: string | null };
}

interface Props {
  slug: string;
  actorRole: OrgRole;
  isPlatformAdmin: boolean;
  currentUserId: string;
}

const ROLE_BADGE: Record<OrgRole, string> = {
  ORG_OWNER: "bg-orange-500/15 text-orange-400 border-orange-400/30",
  ORG_ADMIN: "bg-red-500/15 text-red-400 border-red-400/30",
  ORG_MANAGER: "bg-purple-500/15 text-purple-400 border-purple-400/30",
  ORG_INSTRUCTOR: "bg-amber-500/15 text-amber-400 border-amber-400/30",
  ORG_TA: "bg-yellow-500/15 text-yellow-400 border-yellow-400/30",
  ORG_STUDENT: "bg-blue-500/15 text-blue-400 border-blue-400/30",
  ORG_OBSERVER: "bg-slate-500/15 text-slate-400 border-slate-400/30",
};

export default function OrgMemberManager({
  slug,
  actorRole,
  isPlatformAdmin,
  currentUserId,
}: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<OrgRole | "">("");
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("ORG_STUDENT");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Roles this actor may grant (platform admins may grant anything).
  const assignable = useMemo<OrgRole[]>(
    () => (isPlatformAdmin ? [...ORG_ROLES] : assignableRoles(actorRole)),
    [actorRole, isPlatformAdmin],
  );

  useEffect(() => {
    if (assignable.length && !assignable.includes(inviteRole)) setInviteRole(assignable[0]);
  }, [assignable, inviteRole]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      const res = await fetch(`/api/org/${slug}/members?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMembers(data.members ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [slug, search, roleFilter]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  function canManage(member: Member): boolean {
    if (member.userId === currentUserId) return false;
    return isPlatformAdmin || canManageMember(actorRole, member.role);
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/org/${slug}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Invite sent to ${email}`);
      setName("");
      setEmail("");
      setShowAdd(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(member: Member, role: OrgRole) {
    if (role === member.role) return;
    setBusyId(member.userId);
    try {
      const res = await fetch(`/api/org/${slug}/members/${member.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${member.user.name} is now ${ORG_ROLE_LABEL[role]}`);
      setMembers((m) => m.map((x) => (x.userId === member.userId ? { ...x, role } : x)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change role");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(member: Member) {
    if (!confirm(`Remove ${member.user.name} from the organization?`)) return;
    setBusyId(member.userId);
    try {
      const res = await fetch(`/api/org/${slug}/members/${member.userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Member removed");
      setMembers((m) => m.filter((x) => x.userId !== member.userId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setBusyId(null);
    }
  }

  const canInvite = assignable.length > 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex flex-1 gap-3 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members…"
              className="input-glass pl-9 w-full"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as OrgRole | "")}
            className="input-glass"
            aria-label="Filter by role"
          >
            <option value="">All roles</option>
            {ORG_ROLES.map((r) => (
              <option key={r} value={r}>
                {ORG_ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        {canInvite && (
          <button onClick={() => setShowAdd((s) => !s)} className="btn-primary">
            {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAdd ? "Cancel" : "Add member"}
          </button>
        )}
      </div>

      {showAdd && canInvite && (
        <form
          onSubmit={handleAdd}
          className="bg-card border border-border rounded-xl p-4 mb-5 grid sm:grid-cols-[1fr,1fr,auto,auto] gap-3 animate-fade-in"
        >
          <input
            type="text" className="input-glass" placeholder="Full name"
            value={name} onChange={(e) => setName(e.target.value)} required minLength={2}
          />
          <input
            type="email" className="input-glass" placeholder="email@company.com"
            value={email} onChange={(e) => setEmail(e.target.value)} required
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as OrgRole)}
            className="input-glass"
            aria-label="Role for new member"
          >
            {assignable.map((r) => (
              <option key={r} value={r}>
                {ORG_ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Invite
          </button>
        </form>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <p className="px-5 py-10 text-sm text-muted-foreground text-center">
            No members match your filters.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {members.map((m) => {
              const manageable = canManage(m);
              // Show assignable roles plus the member's current role so the
              // select always reflects reality even if the current role is one
              // the actor could not otherwise grant.
              const options = assignable.includes(m.role) ? assignable : [m.role, ...assignable];
              return (
                <div key={m.userId} className="px-5 py-3 flex items-center gap-3">
                  <Avatar name={m.user.name} avatar={m.user.avatar} seed={m.user.id} size="w-9 h-9" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {m.user.name}
                      {m.userId === currentUserId && (
                        <span className="ml-2 text-[10px] text-muted-foreground">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                  </div>

                  {manageable ? (
                    <select
                      value={m.role}
                      disabled={busyId === m.userId}
                      onChange={(e) => handleRoleChange(m, e.target.value as OrgRole)}
                      className="input-glass text-xs py-1.5"
                      aria-label={`Role for ${m.user.name}`}
                    >
                      {options.map((r) => (
                        <option key={r} value={r}>
                          {ORG_ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`text-[10px] font-medium px-2.5 py-1 rounded-full border whitespace-nowrap ${ROLE_BADGE[m.role]}`}
                    >
                      {ORG_ROLE_LABEL[m.role]}
                    </span>
                  )}

                  <p className="text-xs text-muted-foreground whitespace-nowrap hidden md:block">
                    {new Date(m.joinedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                  </p>

                  <button
                    onClick={() => handleRemove(m)}
                    disabled={!manageable || busyId === m.userId}
                    className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                    aria-label={`Remove ${m.user.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
