"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Files, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWhiteboard } from "./WhiteboardProvider";
import { useWhiteboardPages } from "@/hooks/useWhiteboardPages";

export default function PagePanel() {
  const { pages, activePageId, setActivePageId, canEdit } = useWhiteboard();
  const { createPage, duplicatePage, deletePage, renamePage, reorderPages } =
    useWhiteboardPages();
  const [editing, setEditing] = useState<string | null>(null);

  const ordered = [...pages].sort((a, b) => a.order - b.order);

  function move(index: number, dir: -1 | 1) {
    const next = [...ordered];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorderPages(next.map((p) => p.id));
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Files className="w-3.5 h-3.5" /> Pages
        </span>
        {canEdit && (
          <button
            onClick={createPage}
            title="Add page"
            className="text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
        {ordered.map((page, idx) => (
          <div
            key={page.id}
            className={cn(
              "group rounded-lg px-2 py-1.5 flex items-center gap-2 cursor-pointer text-sm",
              page.id === activePageId
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary/60",
            )}
            onClick={() => setActivePageId(page.id)}
          >
            <span className="text-[10px] w-4 text-center opacity-60">{idx + 1}</span>
            {editing === page.id ? (
              <input
                autoFocus
                defaultValue={page.title}
                onBlur={(e) => {
                  renamePage(page.id, e.target.value.trim() || page.title);
                  setEditing(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                onClick={(e) => e.stopPropagation()}
                className="input-glass flex-1 h-6 text-xs"
              />
            ) : (
              <span
                className="flex-1 truncate"
                onDoubleClick={() => canEdit && setEditing(page.id)}
              >
                {page.title}
              </span>
            )}

            {canEdit && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                <button
                  onClick={(e) => { e.stopPropagation(); move(idx, -1); }}
                  title="Move up"
                  className="hover:text-foreground"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); move(idx, 1); }}
                  title="Move down"
                  className="hover:text-foreground"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); duplicatePage(page.id); }}
                  title="Duplicate"
                  className="hover:text-foreground"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deletePage(page.id); }}
                  title="Delete"
                  className="hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
