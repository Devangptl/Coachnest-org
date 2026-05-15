"use client";

/**
 * Groups client component — receives server-fetched initial data.
 * Re-fetches only on user actions (create, join).
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users, Plus, Search, Lock, Globe, Key, ShieldCheck,
  LogIn, Clock, Check, Loader2, Send, MessageSquare
} from "lucide-react";
import toast from "react-hot-toast";
import CommunityAccessNotice from "@/components/CommunityAccessNotice";

interface Group {
  id: string;
  name: string;
  description: string | null;
  courseId: string | null;
  maxMembers: number;
  isPublic: boolean;
  requiresApproval: boolean;
  inviteCode: string;
  createdAt: string;
  createdBy: { id: string; name: string; avatar: string | null };
  _count: { members: number };
}

interface GroupsClientProps {
  initialGroups: Group[];
  hasCommunityAccess: boolean;
  myMemberships: Record<string, string>; // groupId -> role
  myRequests: Record<string, string>;     // groupId -> status (PENDING/APPROVED/REJECTED)
}

export default function GroupsClient({
  initialGroups,
  hasCommunityAccess,
  myMemberships: initialMemberships,
  myRequests: initialRequests,
}: GroupsClientProps) {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [myMemberships, setMyMemberships] = useState<Record<string, string>>(initialMemberships);
  const [myRequests, setMyRequests] = useState<Record<string, string>>(initialRequests);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIsPublic, setNewIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  const [showJoinCode, setShowJoinCode] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);

  // Join request modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestGroupId, setRequestGroupId] = useState<string | null>(null);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);

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
        body: JSON.stringify({ name: newName, description: newDesc, isPublic: newIsPublic, requiresApproval: !newIsPublic }),
      });
      if (!res.ok) throw new Error();
      toast.success("Group created!");
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      setNewIsPublic(true);
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

  /** Join a group directly (no approval required) */
  async function handleJoinDirect(groupId: string) {
    setJoiningGroupId(groupId);
    try {
      const res = await fetch(`/api/community/groups/${groupId}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Joined group!");
      setMyMemberships(prev => ({ ...prev, [groupId]: "MEMBER" }));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to join");
    } finally {
      setJoiningGroupId(null);
    }
  }

  /** Send a join request (approval required) */
  async function handleSendRequest() {
    if (!requestGroupId) return;
    setJoiningGroupId(requestGroupId);
    try {
      const res = await fetch(`/api/community/groups/${requestGroupId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: requestMessage.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Join request sent! The admin will review it.");
      setMyRequests(prev => ({ ...prev, [requestGroupId]: "PENDING" }));
      setShowRequestModal(false);
      setRequestMessage("");
      setRequestGroupId(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send request");
    } finally {
      setJoiningGroupId(null);
    }
  }

  /** Open the request modal for a specific group */
  function openRequestModal(groupId: string) {
    setRequestGroupId(groupId);
    setRequestMessage("");
    setShowRequestModal(true);
  }

  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="py-6 sm:py-8 space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Study Groups</h1>
          <p className="text-muted-foreground text-sm mt-1">Find or create groups to learn with peers.</p>
        </div>

        <div className="flex flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
          {hasCommunityAccess ? (
            <>
              <button
                onClick={() => setShowJoinCode(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
              >
                <Key className="w-4 h-4" /> Join with Code
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> Create Group
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleLockedClick}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-secondary border border-border text-muted-foreground text-sm font-medium px-4 py-2.5 rounded-lg cursor-not-allowed opacity-60"
                title="Requires Community Access add-on"
              >
                <Lock className="w-3.5 h-3.5" /> Join with Code
              </button>
              <button
                onClick={handleLockedClick}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-secondary border border-border text-muted-foreground text-sm font-semibold px-4 py-2.5 rounded-lg cursor-not-allowed opacity-60"
                title="Requires Community Access add-on"
              >
                <Lock className="w-3.5 h-3.5" /> Create Group
              </button>
            </>
          )}
        </div>
      </div>

      {/* Pro upgrade notice */}
      {!hasCommunityAccess && <CommunityAccessNotice action="create-group" />}

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {filtered.map((g) => {
            const isMember = !!myMemberships[g.id];
            const requestStatus = myRequests[g.id]; // PENDING | APPROVED | REJECTED | undefined
            const isPending = requestStatus === "PENDING";
            const isRejected = requestStatus === "REJECTED";
            const isFull = g._count.members >= g.maxMembers;
            const isJoiningThis = joiningGroupId === g.id;

            return (
              <div
                key={g.id}
                className="rounded-md border border-border bg-card p-4 sm:p-5 transition-all group hover:-translate-y-0.5"
              >
                <Link href={`/community/groups/${g.id}`} className="block">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground text-xs flex items-center gap-1">
                        {g.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {g.isPublic ? "Public" : "Private"}
                      </span>
                    </div>
                  </div>
                  <p className="text-foreground font-semibold text-sm transition-colors">{g.name}</p>
                  {g.description && (
                    <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{g.description}</p>
                  )}
                </Link>

                {/* Footer with member count + Join action */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="text-muted-foreground text-xs flex items-center gap-1.5">
                    <Users className="w-3 h-3" />
                    {g._count.members}/{g.maxMembers} members
                  </span>

                  {/* ── Action buttons ── */}
                  {isMember ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                      <Check className="w-3 h-3" /> Member
                    </span>
                  ) : isPending ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded">
                      <Clock className="w-3 h-3" /> Request Pending
                    </span>
                  ) : isRejected ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded">
                      Declined
                    </span>
                  ) : isFull ? (
                    <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                      Full
                    </span>
                  ) : !hasCommunityAccess ? (
                    <button
                      onClick={(e) => { e.preventDefault(); handleLockedClick(); }}
                      className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-secondary border border-border px-2 py-1 rounded cursor-not-allowed opacity-60"
                      title="Requires Community Access"
                    >
                      <Lock className="w-3 h-3" /> Join
                    </button>
                  ) : !g.isPublic ? (
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); openRequestModal(g.id); }}
                      disabled={isJoiningThis}
                      className="flex items-center gap-1 text-[10px] font-medium text-amber-300 bg-amber-600/90 hover:bg-amber-500 disabled:opacity-50 px-2.5 py-1 rounded-md transition-colors"
                    >
                      {isJoiningThis ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3 h-3" />
                      )}
                      {isJoiningThis ? "Sending…" : "Request to Join"}
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleJoinDirect(g.id); }}
                      disabled={isJoiningThis}
                      className="flex items-center gap-1 text-[10px] font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-2.5 py-1 rounded-md transition-colors"
                    >
                      {isJoiningThis ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <LogIn className="w-3 h-3" />
                      )}
                      {isJoiningThis ? "Joining…" : "Join Group"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Join with Code Modal */}
      {showJoinCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowJoinCode(false)} />
          <div className="relative bg-card border border-border rounded-md p-4 sm:p-6 w-full max-w-[400px] shadow-2xl my-auto max-h-[calc(100vh-2rem)] overflow-y-auto">
            <h2 className="text-base sm:text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-500 flex-shrink-0" /> Join with Code
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-card border border-border rounded-md p-4 sm:p-6 w-full max-w-lg shadow-2xl my-auto max-h-[calc(100vh-2rem)] overflow-y-auto">
            <h2 className="text-base sm:text-lg font-bold text-foreground mb-4">Create Study Group</h2>
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
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Group Visibility</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewIsPublic(true)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                      newIsPublic
                        ? "bg-emerald-600/10 border-emerald-500/40 text-emerald-400"
                        : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Globe className="w-4 h-4" /> Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewIsPublic(false)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                      !newIsPublic
                        ? "bg-amber-600/10 border-amber-500/40 text-amber-400"
                        : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Lock className="w-4 h-4" /> Private
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {newIsPublic
                    ? "Anyone can join this group directly."
                    : "New members must be approved by you before joining."}
                </p>
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

      {/* Request to Join Modal */}
      {showRequestModal && requestGroupId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowRequestModal(false); setRequestGroupId(null); }} />
          <div className="relative bg-card border border-border rounded-md p-4 sm:p-6 w-full max-w-[420px] shadow-2xl my-auto max-h-[calc(100vh-2rem)] overflow-y-auto">
            <h2 className="text-base sm:text-lg font-bold text-foreground mb-1 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0" /> Request to Join
            </h2>
            <p className="text-muted-foreground text-xs mb-4">
              This group requires admin approval. Optionally add a message to introduce yourself.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Message (optional)
                </label>
                <textarea
                  rows={3}
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Hi, I'd like to join because..."
                  className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 resize-none"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => { setShowRequestModal(false); setRequestGroupId(null); }}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendRequest}
                  disabled={joiningGroupId === requestGroupId}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  {joiningGroupId === requestGroupId ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  ) : (
                    <><Send className="w-4 h-4" /> Send Request</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
