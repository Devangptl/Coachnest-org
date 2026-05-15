"use client";

/**
 * Author-only edit/delete menu shown on user-generated content
 * (forum threads, replies, group notes, peer-review submissions).
 *
 * Renders nothing if the viewer isn't the author or an admin.
 */
import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

interface Props {
  /** Show the menu only if true. The parent computes ownership/admin. */
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  size?: "sm" | "md";
}

export default function AuthorActionsMenu({
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  size = "md",
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  if (!canEdit && !canDelete) return null;

  const btnSize = size === "sm" ? "w-7 h-7" : "w-8 h-8";
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
        className={`${btnSize} rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors`}
        aria-label="Actions"
      >
        <MoreHorizontal className={iconSize} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-36 rounded-md border border-border bg-card shadow-lg z-30 overflow-hidden">
          {canEdit && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onEdit?.(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onDelete?.(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
