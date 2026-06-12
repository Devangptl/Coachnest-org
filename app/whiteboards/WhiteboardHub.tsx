"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Files,
  PencilLine,
  PencilRuler,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { WhiteboardListItemDTO, WhiteboardScope } from "@/types/whiteboard";

const SCOPE_BADGE: Record<WhiteboardScope, { label: string; cls: string }> = {
  STANDALONE: { label: "Personal", cls: "bg-orange-500/10 text-[#d97757] border-[#d97757]/25" },
  STUDENT_NOTE: { label: "Lesson notes", cls: "bg-blue-500/10 text-blue-400 border-blue-400/25" },
  LESSON: { label: "Lesson", cls: "bg-violet-500/10 text-violet-400 border-violet-400/25" },
  COURSE: { label: "Course", cls: "bg-violet-500/10 text-violet-400 border-violet-400/25" },
  LIVE_CLASS: { label: "Class", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-400/25" },
  ASSIGNMENT: { label: "Assignment", cls: "bg-amber-500/10 text-amber-400 border-amber-400/25" },
  GROUP_PROJECT: { label: "Group", cls: "bg-cyan-500/10 text-cyan-400 border-cyan-400/25" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function WhiteboardHub({
  initialBoards,
  currentUserId,
}: {
  initialBoards: WhiteboardListItemDTO[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [boards, setBoards] = useState(initialBoards);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return boards;
    return boards.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        SCOPE_BADGE[b.scope].label.toLowerCase().includes(q),
    );
  }, [boards, query]);

  async function createBoard() {
    setCreating(true);
    try {
      const res = await fetch("/api/whiteboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "STANDALONE", defaultRole: "VIEWER" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/whiteboards/${data.whiteboard.id}`);
    } catch {
      toast.error("Could not create whiteboard");
      setCreating(false);
    }
  }

  async function renameBoard(id: string, title: string) {
    setRenamingId(null);
    const prev = boards;
    const trimmed = title.trim();
    if (!trimmed || trimmed === boards.find((b) => b.id === id)?.title) return;
    setBoards((bs) => bs.map((b) => (b.id === id ? { ...b, title: trimmed } : b)));
    const res = await fetch(`/api/whiteboards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    }).catch(() => null);
    if (!res?.ok) {
      setBoards(prev);
      toast.error("Rename failed");
    }
  }

  async function deleteBoard(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const prev = boards;
    setBoards((bs) => bs.filter((b) => b.id !== id));
    const res = await fetch(`/api/whiteboards/${id}`, { method: "DELETE" }).catch(
      () => null,
    );
    if (!res?.ok) {
      setBoards(prev);
      toast.error("Delete failed");
    } else {
      toast.success("Whiteboard deleted");
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-6 sm:py-8">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-orange-500/15 border border-[#d97757]/20 flex items-center justify-center">
          <PencilRuler className="w-5 h-5 text-[#d97757]" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-xl sm:text-2xl font-bold">Whiteboards</h1>
          <p className="text-sm text-muted-foreground">
            Sketch ideas, take notes, and collaborate in real time.
          </p>
        </div>
        <Button onClick={createBoard} loading={creating}>
          <Plus className="w-4 h-4" /> New whiteboard
        </Button>
      </div>

      {boards.length > 0 && (
        <div className="relative mb-5 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search whiteboards…"
            className="input-glass w-full h-10 pl-9 text-sm"
          />
        </div>
      )}

      {boards.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg">
          <PencilRuler className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold mb-1">No whiteboards yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Create one to brainstorm, or open a lesson to find its class board.
          </p>
          <Button onClick={createBoard} loading={creating}>
            <Plus className="w-4 h-4" /> Create your first whiteboard
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          No whiteboards match “{query}”.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((board) => {
            const badge = SCOPE_BADGE[board.scope];
            const isOwner = board.ownerId === currentUserId;
            return (
              <div
                key={board.id}
                onClick={() => router.push(`/whiteboards/${board.id}`)}
                className="group bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-[#d97757]/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  {renamingId === board.id ? (
                    <input
                      autoFocus
                      defaultValue={board.title}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => renameBoard(board.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      className="input-glass flex-1 h-8 text-sm"
                    />
                  ) : (
                    <p className="font-semibold text-sm truncate">{board.title}</p>
                  )}
                  {isOwner && renamingId !== board.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingId(board.id);
                        }}
                        title="Rename"
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary"
                      >
                        <PencilLine className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteBoard(board.id, board.title);
                        }}
                        title="Delete"
                        className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-secondary"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", badge.cls)}>
                    {badge.label}
                  </span>
                  {!isOwner && (
                    <span className="text-[10px] text-muted-foreground">
                      by {board.ownerName}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Files className="w-3 h-3" />
                    {board.pageCount} {board.pageCount === 1 ? "page" : "pages"}
                  </span>
                  {board.collaboratorCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {board.collaboratorCount}
                    </span>
                  )}
                  <span className="ml-auto">{timeAgo(board.updatedAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
