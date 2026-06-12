"use client";

/**
 * OrgMembersClient — list/add/remove org members of a given role.
 * Used by both the Instructors and Students admin pages.
 */
import { useCallback, useEffect, useState, FormEvent } from "react";
import toast from "react-hot-toast";
import { Loader2, Plus, Trash2, Search, X } from "lucide-react";
import Avatar from "@/components/Avatar";

interface Member {
  userId: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string; email: string; avatar: string | null };
}

interface Props {
  slug: string;
  role: "ORG_INSTRUCTOR" | "ORG_STUDENT";
  roleLabel: string; // "Instructor" | "Student"
}

export default function OrgMembersClient({ slug, role, roleLabel }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ role });
      if (search) params.set("search", search);
      const res = await fetch(`/api/org/${slug}/members?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMembers(data.members ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [slug, role, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/org/${slug}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${roleLabel} added — invite sent to ${email}`);
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

  async function handleRemove(member: Member) {
    if (!confirm(`Remove ${member.user.name} from the organization?`)) return;
    try {
      const res = await fetch(`/api/org/${slug}/members/${member.userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Member removed");
      setMembers((m) => m.filter((x) => x.userId !== member.userId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${roleLabel.toLowerCase()}s…`}
            className="input-glass pl-9 w-full"
          />
        </div>
        <button onClick={() => setShowAdd((s) => !s)} className="btn-primary">
          {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAdd ? "Cancel" : `Add ${roleLabel}`}
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="bg-card border border-border rounded-xl p-4 mb-5 grid sm:grid-cols-[1fr,1fr,auto] gap-3 animate-fade-in"
        >
          <input
            type="text" className="input-glass" placeholder="Full name"
            value={name} onChange={(e) => setName(e.target.value)} required minLength={2}
          />
          <input
            type="email" className="input-glass" placeholder="email@company.com"
            value={email} onChange={(e) => setEmail(e.target.value)} required
          />
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
            No {roleLabel.toLowerCase()}s yet. Invite one to get started.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {members.map((m) => (
              <div key={m.userId} className="px-5 py-3 flex items-center gap-3">
                <Avatar name={m.user.name} avatar={m.user.avatar} seed={m.user.id} size="w-9 h-9" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{m.user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                </div>
                <p className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
                  Joined {new Date(m.joinedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <button
                  onClick={() => handleRemove(m)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  aria-label={`Remove ${m.user.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
