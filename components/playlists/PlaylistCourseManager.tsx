"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GripVertical,
  ArrowUp,
  ArrowDown,
  X,
  BookOpen,
  Plus,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/UIDialogProvider";
import { formatMinutes } from "@/lib/utils";
import AddCoursesModal from "./AddCoursesModal";

interface Item {
  id: string;
  order: number;
  course: {
    id: string;
    title: string;
    thumbnail: string | null;
    level: string;
    totalLessons: number;
    totalDuration: number;
    status: string;
  };
}

export default function PlaylistCourseManager({
  playlistId,
}: {
  playlistId: string;
}) {
  const confirm = useConfirm();
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const loadAll = useCallback(async () => {
    try {
      let page = 1;
      let all: Item[] = [];
      // Playlists are modest in size — page through fully for management.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const res = await fetch(
          `/api/playlists/${playlistId}/courses?page=${page}`,
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        all = [...all, ...data.items];
        if (!data.hasMore) break;
        page += 1;
      }
      setItems(all);
    } catch {
      toast.error("Failed to load courses");
    } finally {
      setLoaded(true);
    }
  }, [playlistId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function persistOrder(next: Item[]) {
    setItems(next);
    setBusy(true);
    try {
      const res = await fetch(`/api/playlists/${playlistId}/courses`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: next.map((it, i) => ({ itemId: it.id, order: i })),
        }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Failed to save order");
      loadAll();
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    persistOrder(next);
  }

  function onDrop(index: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    setOverIndex(null);
    if (from === null || from === index) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    persistOrder(next);
  }

  async function remove(itemId: string) {
    const ok = await confirm("Remove this course from the list?", {
      title: "Remove course",
      confirmText: "Remove",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/playlists/${playlistId}/courses/${itemId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((it) => it.id !== itemId));
      toast.success("Removed");
    } catch {
      toast.error("Failed to remove");
    } finally {
      setBusy(false);
    }
  }

  const totalDuration = items.reduce(
    (s, it) => s + it.course.totalDuration,
    0,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {items.length} course{items.length !== 1 ? "s" : ""} ·{" "}
          {formatMinutes(totalDuration)}
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" /> Add courses
        </Button>
      </div>

      {!loaded ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="glass p-10 rounded-xl text-center">
          <BookOpen className="w-12 h-12 text-orange-500/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            No courses yet. Add some to build your list.
          </p>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" /> Add courses
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => (
            <div
              key={it.id}
              draggable={!busy}
              onDragStart={() => (dragIndex.current = i)}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIndex(i);
              }}
              onDragEnd={() => {
                dragIndex.current = null;
                setOverIndex(null);
              }}
              onDrop={() => onDrop(i)}
              className={`glass p-3 rounded-lg flex items-center gap-3 transition-all ${
                overIndex === i ? "ring-2 ring-orange-500/40" : ""
              } ${busy ? "opacity-70" : ""}`}
            >
              <span
                className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
                aria-hidden
              >
                <GripVertical className="w-4 h-4" />
              </span>
              <span className="text-sm font-bold text-orange-500 w-6 text-center tabular-nums">
                {i + 1}
              </span>
              {it.course.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.course.thumbnail}
                  alt=""
                  className="w-14 h-10 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-10 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {it.course.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="capitalize">{it.course.level}</span> ·{" "}
                  {it.course.totalLessons} lessons ·{" "}
                  {formatMinutes(it.course.totalDuration)}
                  {it.course.status !== "PUBLISHED" && (
                    <span className="text-amber-500"> · {it.course.status}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={busy || i === 0}
                  onClick={() => move(i, -1)}
                  aria-label="Move up"
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={busy || i === items.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label="Move down"
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => remove(it.id)}
                  aria-label="Remove"
                >
                  <X className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddCoursesModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        playlistId={playlistId}
        onAdded={loadAll}
      />
    </div>
  );
}
