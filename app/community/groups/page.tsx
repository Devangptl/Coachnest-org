"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Plus, Search, Lock, Globe, Key } from "lucide-react";
import toast from "react-hot-toast";
import { usePurchasedFeatures } from "@/hooks/usePurchasedFeatures";
import CommunityProNotice from "@/components/CommunityProNotice";

interface Group {
  id: string;
  name: string;
  description: string | null;
  courseId: string | null;
  maxMembers: number;
  isPublic: boolean;
  inviteCode: string;
  createdAt: string;
  createdBy: { id: string; name: string; avatar: string | null };
  _count: { members: number };
}

export default function StudyGroupsPage() {
  const router = useRouter();
  const { hasCommunityAccess: hasInstructorQA, isLoading: subLoading } = usePurchasedFeatures();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const [showJoinCode, setShowJoinCode] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/community/groups");
      const data = await res.json();
      setGroups(data.groups || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleLockedClick() {
    toast("Community Access required to create study groups.", { icon: "🔒" });
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/community/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDesc }),
      });
      if (!res.ok) throw new Error();
      toast.success("Group created!");
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      load();
    } catch {
      toast.error("Failed to create group");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoinWithCode() {
    if (!inviteCode.trim()) return;
    setJoining(true);
    try {
      const res = await fetch("/api/community/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join group");
      toast.success("Successfully joined the group!");
      setShowJoinCode(false);
      setInviteCode("");
      router.push(`/community/groups/${data.groupId}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to join group");
    } finally {
      setJoining(false);
    }
  }

  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Study Groups</h1>
          <p className="text-muted-foreground text-sm mt-1">Find or create groups to learn with peers.</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {hasInstructorQA ? (
            <>
              <button
                onClick={() => setShowJoinCode(true)}
                className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
              >
                <Key className="w-4 h-4" /> Join with Code
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> Create Group
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleLockedClick}
                disabled={subLoading}
                className="flex items-center gap-2 bg-secondary border border-border text-muted-foreground text-sm font-medium px-4 py-2.5 rounded-lg cursor-not-allowed opacity-60"
                title="Requires Community Access add-on"
              >
                <Lock className="w-3.5 h-3.5" /> Join with Code
              </button>
              <button
                onClick={handleLockedClick}
                disabled={subLoading}
                className="flex items-center gap-2 bg-secondary border border-border text-muted-foreground text-sm font-semibold px-4 py-2.5 rounded-lg cursor-not-allowed opacity-60"
                title="Requires Community Access add-on"
              >
                <Lock className="w-3.5 h-3.5" /> Create Group
              </button>
            </>
          )}
        </div>
      </div>

      {/* Pro upgrade notice */}
      {!subLoading && !hasInstructorQA && <CommunityProNotice action="create-group" />}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search groups..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary/20 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
        />
      </div>

      {/* Groups grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-36 rounded-md bg-secondary/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-12 text-center">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground text-sm">
            {search ? "No groups match your search." : "No study groups yet. Create one!"}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((g) => (
            <Link
              key={g.id}
              href={`/community/groups/${g.id}`}
              className="rounded-md border border-border bg-card  p-5 transition-all group hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-muted-foreground text-xs flex items-center gap-1">
                  {g.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {g.isPublic ? "Public" : "Private"}
                </span>
              </div>
              <p className="text-foreground font-semibold text-sm  transition-colors">{g.name}</p>
              {g.description && (
                <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{g.description}</p>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className="text-muted-foreground text-xs flex items-center gap-1.5">
                  <Users className="w-3 h-3" />
                  {g._count.members}/{g.maxMembers} members
                </span>
                <span className="text-muted-foreground/50 text-xs">by {g.createdBy.name}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Join with Code Modal */}
      {showJoinCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowJoinCode(false)} />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-[400px] shadow-2xl">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-500" /> Join with Code
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Invite Code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Paste your 12-character code here"
                  className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={() => setShowJoinCode(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleJoinWithCode}
                  disabled={joining || !inviteCode.trim()}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  {joining ? "Joining…" : "Join Group"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="text-lg font-bold text-foreground mb-4">Create Study Group</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Group Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Advanced React Study Group"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description (optional)</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="What will this group focus on?"
                  className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  {creating ? "Creating…" : "Create Group"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
