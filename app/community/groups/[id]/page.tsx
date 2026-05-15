"use client";

/**
 * Study Group Workspace — full featured group page with tabs:
 * Overview (members, join/leave) | Shared Notes | Progress & XP | Requests (admin)
 */
import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Users, Copy, LogIn, LogOut, Crown, Clock, Globe, Lock,
  FileText, Plus, TrendingUp, Award, Flame, Zap, BookOpen, Target,
  BarChart3, Send, ShieldCheck, Check, X, Loader2, MessageSquare
} from "lucide-react";
import toast from "react-hot-toast";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { channels, events } from "@/lib/realtime/channels";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import AuthorActionsMenu from "@/components/AuthorActionsMenu";

/* ─── Types ─────────────────────────────────────────────────── */

interface Member {
  userId: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string; avatar: string | null };
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  maxMembers: number;
  isPublic: boolean;
  requiresApproval: boolean;
  groupXp: number;
  createdAt: string;
  createdBy: { id: string; name: string; avatar: string | null };
  members: Member[];
  _count: { members: number; notes: number; joinRequests: number };
}

interface MyRequest {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; avatar: string | null };
}

interface MemberStat {
  user: { id: string; name: string; avatar: string | null };
  completedLessons: number;
  totalEnrollments: number;
  xp: number;
  level: number;
  streak: number;
  badges: number;
  quizzesPassed: number;
}

interface ProgressData {
  groupXp: number;
  aggregate: {
    totalLessons: number;
    totalXp: number;
    totalBadges: number;
    totalQuizzes: number;
    avgLevel: number;
  };
  members: MemberStat[];
}

interface JoinRequestItem {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null; email: string };
}

type TabKey = "overview" | "notes" | "progress" | "requests";

/* ─── Component ─────────────────────────────────────────────── */

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [group, setGroup] = useState<Group | null>(null);
  const [myRequest, setMyRequest] = useState<MyRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [showCreateNote, setShowCreateNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [creatingNote, setCreatingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState({ title: "", content: "" });
  const [savingNote, setSavingNote] = useState(false);

  // Progress state
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  // Join request message modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");

  // Admin join requests
  const [joinRequests, setJoinRequests] = useState<JoinRequestItem[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function loadGroup() {
    try {
      const [groupRes, meRes] = await Promise.all([
        fetch(`/api/community/groups/${id}`),
        fetch("/api/auth/me"),
      ]);
      const groupData = await groupRes.json();
      const meData = await meRes.json();
      setGroup(groupData.group);
      setMyRequest(groupData.myRequest ?? null);
      setCurrentUserId(meData.user?.userId || meData.user?.id || null);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  const loadNotes = useCallback(async () => {
    setNotesLoading(true);
    try {
      const res = await fetch(`/api/community/groups/${id}/notes`);
      const data = await res.json();
      setNotes(data.notes || []);
    } catch { /* ignore */ } finally {
      setNotesLoading(false);
    }
  }, [id]);

  async function loadProgress() {
    setProgressLoading(true);
    try {
      const res = await fetch(`/api/community/groups/${id}/progress`);
      const data = await res.json();
      setProgress(data);
    } catch { /* ignore */ } finally {
      setProgressLoading(false);
    }
  }

  async function loadJoinRequests() {
    setRequestsLoading(true);
    try {
      const res = await fetch(`/api/community/groups/${id}/requests`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load requests");
      setJoinRequests(data.requests || []);
    } catch (e: any) {
      toast.error(e.message || "Could not load join requests");
    } finally {
      setRequestsLoading(false);
    }
  }

  useEffect(() => { loadGroup(); }, [id]);
  useEffect(() => {
    if (tab === "notes") loadNotes();
    if (tab === "progress") loadProgress();
    if (tab === "requests") loadJoinRequests();
  }, [tab, id, loadNotes]);

  useRealtimeChannel(tab === "notes" ? channels.groupNotes(id) : null, {
    [events.groupNoteCreated]: loadNotes,
  });

  const isMember = group?.members.some(m => m.userId === currentUserId);
  const isAdmin = group?.members.some(m => m.userId === currentUserId && m.role === "ADMIN");
  const isCreator = group?.createdBy.id === currentUserId;

  async function handleJoinDirect() {
    setJoining(true);
    try {
      const res = await fetch(`/api/community/groups/${id}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Joined group!");
      loadGroup();
    } catch (e: any) {
      toast.error(e.message || "Failed to join");
    } finally {
      setJoining(false);
    }
  }

  async function handleSendRequest() {
    setJoining(true);
    try {
      const res = await fetch(`/api/community/groups/${id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: requestMessage.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Join request sent! The admin will review it.");
      setShowRequestModal(false);
      setRequestMessage("");
      loadGroup();
    } catch (e: any) {
      toast.error(e.message || "Failed to send request");
    } finally {
      setJoining(false);
    }
  }

  async function handleLeave() {
    setLeaving(true);
    try {
      const res = await fetch(`/api/community/groups/${id}/leave`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Left group");
      loadGroup();
    } catch (e: any) {
      toast.error(e.message || "Failed to leave");
    } finally {
      setLeaving(false);
    }
  }

  function copyInviteCode() {
    if (!group) return;
    navigator.clipboard.writeText(group.inviteCode);
    toast.success("Invite code copied!");
  }

  async function handleCreateNote() {
    if (!noteTitle.trim() || !noteContent.trim()) return;
    setCreatingNote(true);
    try {
      const res = await fetch(`/api/community/groups/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: noteTitle, content: noteContent }),
      });
      if (!res.ok) throw new Error();
      toast.success("Note shared! +25 Group XP");
      setShowCreateNote(false);
      setNoteTitle("");
      setNoteContent("");
      loadNotes();
      loadGroup();
    } catch {
      toast.error("Failed to create note");
    } finally {
      setCreatingNote(false);
    }
  }

  function startEditNote(note: Note) {
    setEditingNoteId(note.id);
    setNoteDraft({ title: note.title, content: note.content });
  }

  async function saveNoteEdit() {
    if (!editingNoteId || !noteDraft.title.trim() || !noteDraft.content.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/community/groups/${id}/notes/${editingNoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noteDraft),
      });
      if (!res.ok) throw new Error();
      toast.success("Note updated");
      setEditingNoteId(null);
      setNoteDraft({ title: "", content: "" });
      loadNotes();
    } catch {
      toast.error("Failed to update note");
    } finally {
      setSavingNote(false);
    }
  }

  async function deleteNote(noteId: string) {
    if (!confirm("Delete this note? -25 Group XP will be reversed.")) return;
    try {
      const res = await fetch(`/api/community/groups/${id}/notes/${noteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Note deleted");
      loadNotes();
      loadGroup();
    } catch {
      toast.error("Failed to delete note");
    }
  }

  async function handleRequest(requestId: string, action: "approve" | "reject") {
    setProcessingId(requestId);
    try {
      const res = await fetch(`/api/community/groups/${id}/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process request");
      toast.success(action === "approve" ? "Request approved!" : "Request rejected");
      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
      if (action === "approve") loadGroup();
    } catch (e: any) {
      toast.error(e.message || "Failed to process request");
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <div className="py-8 space-y-4">
        <div className="h-8 w-32 rounded bg-secondary/50 animate-pulse" />
        <div className="h-60 rounded-md bg-secondary/50 animate-pulse" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">Group not found.</p>
        <Link href="/community/groups" className="text-emerald-400 text-sm mt-2 inline-block hover:underline">← Back to groups</Link>
      </div>
    );
  }

  const TABS: { key: TabKey; label: string; icon: any }[] = [
    { key: "overview", label: "Members", icon: Users },
  ];

  if (isMember) {
    TABS.push(
      { key: "notes", label: `Notes (${group._count.notes})`, icon: FileText },
      { key: "progress", label: "Progress", icon: BarChart3 }
    );
  }

  if (isAdmin) {
    TABS.push({
      key: "requests",
      label: `Requests${group._count.joinRequests > 0 ? ` (${group._count.joinRequests})` : ""}`,
      icon: ShieldCheck,
    });
  }

  const pendingRequest = myRequest?.status === "PENDING";

  return (
    <div className="py-6 sm:py-8 space-y-5 sm:space-y-6">
      <Link href="/community/groups" className="inline-flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Groups
      </Link>

      {/* ── Group Header ──────────────────────────────────── */}
      <div className="rounded-md border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-muted-foreground text-xs flex items-center gap-1">
                {group.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {group.isPublic ? "Public" : "Private"}
              </span>
              {!group.isPublic && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                  <ShieldCheck className="w-3 h-3" /> Approval required
                </span>
              )}
              <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <Zap className="w-3 h-3" /> {group.groupXp} XP
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground break-words">{group.name}</h1>
            {group.description && (
              <p className="text-muted-foreground text-sm mt-2 leading-relaxed break-words">{group.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {isMember && !isCreator && (
              <button onClick={handleLeave} disabled={leaving}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-colors">
                <LogOut className="w-3.5 h-3.5" /> {leaving ? "Leaving…" : "Leave"}
              </button>
            )}
            {!isMember && !pendingRequest && (
              !group.isPublic ? (
                <button
                  onClick={() => setShowRequestModal(true)}
                  disabled={joining}
                  className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> {joining ? "Sending…" : "Request to Join"}
                </button>
              ) : (
                <button onClick={handleJoinDirect} disabled={joining}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors">
                  <LogIn className="w-3.5 h-3.5" /> {joining ? "Joining…" : "Join Group"}
                </button>
              )
            )}
            {pendingRequest && (
              <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
                <Clock className="w-3.5 h-3.5" /> Request pending
              </span>
            )}
            {myRequest?.status === "REJECTED" && (
              <span className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                Request declined
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 border-t border-border text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> {group._count.members}/{group.maxMembers} members
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Created {new Date(group.createdAt).toLocaleDateString()}
          </span>
          {isMember && (
            <button onClick={copyInviteCode}
              className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors sm:ml-auto">
              <Copy className="w-3.5 h-3.5" /> Copy invite code
            </button>
          )}
        </div>
      </div>

      {/* ── Tab Navigation ────────────────────────────────── */}
      <div className="-mx-3 sm:mx-0 px-3 sm:px-0 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 p-1 bg-secondary rounded-lg w-fit min-w-min">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  tab === t.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ───────────────────────────────────── */}

      {/* OVERVIEW (Members) */}
      {tab === "overview" && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Members ({group.members.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {group.members.map((m) => (
              <div key={m.userId} className="flex items-center gap-3 p-3 sm:p-4 rounded-md border border-border bg-card">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground text-sm font-bold flex-shrink-0">
                  {m.user.avatar ? (
                    <img src={m.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : m.user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">{m.user.name}</p>
                  <p className="text-muted-foreground text-xs truncate">Joined {new Date(m.joinedAt).toLocaleDateString()}</p>
                </div>
                {m.role === "ADMIN" && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full flex-shrink-0">
                    <Crown className="w-3 h-3" /> Admin
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SHARED NOTES */}
      {tab === "notes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Shared Notes
            </h2>
            {isMember && (
              <button
                onClick={() => setShowCreateNote(true)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Note
              </button>
            )}
          </div>

          {notesLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-28 rounded-lg bg-secondary/50 animate-pulse" />)}
            </div>
          ) : notes.length === 0 ? (
            <div className="rounded-md border border-border bg-card p-10 text-center">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">No shared notes yet.</p>
              {isMember && (
                <p className="text-muted-foreground/60 text-xs mt-1">Share a note to earn +25 Group XP!</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => {
                const isNoteAuthor = note.author.id === currentUserId;
                const noteEdited =
                  new Date(note.updatedAt).getTime() - new Date(note.createdAt).getTime() > 1000;
                const isEditingThisNote = editingNoteId === note.id;
                return (
                  <div key={note.id} className="rounded-md border border-border bg-card p-4 sm:p-5">
                    {isEditingThisNote ? (
                      <div className="space-y-3">
                        <input
                          value={noteDraft.title}
                          onChange={(e) => setNoteDraft({ ...noteDraft, title: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50"
                          placeholder="Title"
                        />
                        <textarea
                          rows={6}
                          value={noteDraft.content}
                          onChange={(e) => setNoteDraft({ ...noteDraft, content: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 resize-none"
                          placeholder="Content (Markdown supported)"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setEditingNoteId(null); setNoteDraft({ title: "", content: "" }); }}
                            className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveNoteEdit}
                            disabled={savingNote || !noteDraft.title.trim() || !noteDraft.content.trim()}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium px-4 py-1.5 rounded-md transition-colors"
                          >
                            {savingNote ? "Saving…" : "Save"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-foreground font-semibold text-sm break-words flex-1">{note.title}</h3>
                          <AuthorActionsMenu
                            size="sm"
                            canEdit={isNoteAuthor}
                            canDelete={isNoteAuthor || !!isAdmin}
                            onEdit={() => startEditNote(note)}
                            onDelete={() => deleteNote(note.id)}
                          />
                        </div>
                        <div className="text-sm leading-relaxed break-words">
                          <MarkdownRenderer content={note.content} compact />
                        </div>
                      </>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-3 border-t border-border">
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-foreground text-[10px] font-bold flex-shrink-0">
                        {note.author.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={note.author.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : note.author.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-muted-foreground text-xs">{note.author.name}</span>
                      <span className="text-muted-foreground/40 text-xs">·</span>
                      <span className="text-muted-foreground/60 text-xs">{new Date(note.updatedAt).toLocaleDateString()}</span>
                      {noteEdited && <span className="text-muted-foreground/60 text-[10px]">(edited)</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Create Note Modal */}
          {showCreateNote && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateNote(false)} />
              <div className="relative bg-card border border-border rounded-md p-4 sm:p-6 w-full max-w-lg shadow-2xl my-auto max-h-[calc(100vh-2rem)] overflow-y-auto">
                <h2 className="text-base sm:text-lg font-bold text-foreground mb-1">Share a Note</h2>
                <p className="text-muted-foreground text-xs mb-4">Notes are shared with all group members. +25 Group XP per note!</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title</label>
                    <input
                      type="text" value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      placeholder="e.g. React Hooks Summary"
                      className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Content</label>
                    <textarea
                      rows={8} value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Write your notes, paste summaries, share key takeaways..."
                      className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <button onClick={() => setShowCreateNote(false)}
                      className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                    <button
                      onClick={handleCreateNote}
                      disabled={creatingNote || !noteTitle.trim() || !noteContent.trim()}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                    >
                      <Send className="w-4 h-4" /> {creatingNote ? "Sharing…" : "Share Note"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PROGRESS & XP */}
      {tab === "progress" && (
        <div className="space-y-6">
          {progressLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[1,2,3,4,5].map(i => <div key={i} className="h-24 rounded-md bg-secondary/50 animate-pulse" />)}
              </div>
              <div className="h-60 rounded-md bg-secondary/50 animate-pulse" />
            </div>
          ) : !progress ? (
            <div className="rounded-md border border-border bg-card p-10 text-center">
              <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">Progress data unavailable.</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-emerald-600/10 p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-md bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-emerald-400 text-xl sm:text-2xl font-bold">{progress.groupXp} XP</p>
                  <p className="text-muted-foreground text-xs">Group XP earned from shared notes, activities & milestones</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  { icon: BookOpen, label: "Lessons Done", value: progress.aggregate.totalLessons, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
                  { icon: Zap, label: "Total XP", value: progress.aggregate.totalXp, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                  { icon: Award, label: "Badges", value: progress.aggregate.totalBadges, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
                  { icon: Target, label: "Quizzes Passed", value: progress.aggregate.totalQuizzes, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
                  { icon: TrendingUp, label: "Avg Level", value: progress.aggregate.avgLevel, color: "text-[#d97757]", bg: "bg-orange-500/10 border-orange-500/20" },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="rounded-md border border-border bg-card p-4 text-center">
                      <div className={`w-8 h-8 rounded-lg ${stat.bg} border flex items-center justify-center mx-auto mb-2`}>
                        <Icon className={`w-4 h-4 ${stat.color}`} />
                      </div>
                      <p className="text-foreground text-lg font-bold">{stat.value}</p>
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{stat.label}</p>
                    </div>
                  );
                })}
              </div>

              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#d97757]" /> Member Leaderboard
                </h2>
                <div className="space-y-2">
                  {progress.members.map((m, i) => (
                    <div key={m.user?.id} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-md border border-border bg-card">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        i === 0 ? "bg-amber-500/15 text-amber-400 border border-amber-500/25" :
                        i === 1 ? "bg-gray-500/15 text-gray-400 border border-gray-500/25" :
                        i === 2 ? "bg-orange-500/15 text-[#d97757] border border-orange-500/25" :
                        "bg-secondary text-muted-foreground"
                      }`}>
                        {i + 1}
                      </span>
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-foreground text-sm font-bold flex-shrink-0">
                        {m.user?.avatar ? (
                          <img src={m.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : m.user?.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm font-medium truncate">{m.user?.name}</p>
                        <p className="text-muted-foreground text-xs truncate">
                          Lv. {m.level} · {m.completedLessons} lessons · {m.badges} badges
                          {m.streak > 0 && <span className="text-[#d97757]"> · 🔥 {m.streak}d</span>}
                        </p>
                      </div>
                      <span className="text-emerald-400 text-xs sm:text-sm font-bold flex-shrink-0">{m.xp} XP</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* JOIN REQUESTS (admin only) */}
      {tab === "requests" && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Pending Join Requests
          </h2>

          {requestsLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-20 rounded-lg bg-secondary/50 animate-pulse" />)}
            </div>
          ) : joinRequests.length === 0 ? (
            <div className="rounded-md border border-border bg-card p-10 text-center">
              <ShieldCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">No pending requests.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {joinRequests.map((req) => (
                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-md border border-border bg-card">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground text-sm font-bold flex-shrink-0">
                      {req.user.avatar ? (
                        <img src={req.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : req.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-medium truncate">{req.user.name}</p>
                      <p className="text-muted-foreground text-xs truncate">{req.user.email}</p>
                      {req.message && (
                        <p className="text-muted-foreground/80 text-xs mt-1 flex items-start gap-1">
                          <MessageSquare className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{req.message}</span>
                        </p>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs hidden md:block flex-shrink-0">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleRequest(req.id, "approve")}
                      disabled={processingId === req.id}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                    >
                      {processingId === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleRequest(req.id, "reject")}
                      disabled={processingId === req.id}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                    >
                      {processingId === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Request to Join Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRequestModal(false)} />
          <div className="relative bg-card border border-border rounded-md p-6 w-full max-w-[420px] shadow-2xl">
            <h2 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" /> Request to Join
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
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => setShowRequestModal(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSendRequest}
                  disabled={joining}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  {joining ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Send Request</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
