"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Download,
  Image as ImageIcon,
  Link2,
  Lock,
  PanelLeft,
  PanelRight,
  PencilLine,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useWhiteboard } from "./WhiteboardProvider";
import type { WhiteboardRole } from "@/types/whiteboard";

const ROLE_BADGE: Record<WhiteboardRole, { label: string; cls: string }> = {
  OWNER: { label: "Owner", cls: "bg-amber-500/15 text-amber-400 border-amber-400/25" },
  EDITOR: { label: "Editor", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-400/25" },
  VIEWER: { label: "View only", cls: "bg-secondary text-muted-foreground border-border" },
};

export default function WhiteboardTopbar({
  onToggleLeft,
  onToggleRight,
}: {
  onToggleLeft: () => void;
  onToggleRight: () => void;
}) {
  const { boardId, title, setTitle, role, canManage, apiRef } = useWhiteboard();
  const [busy, setBusy] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  // Embedded boards (lesson/class iframes) shouldn't navigate the iframe to the hub.
  const [embedded, setEmbedded] = useState(true);
  const badge = ROLE_BADGE[role];

  useEffect(() => {
    setEmbedded(window.self !== window.top);
  }, []);

  async function saveTitle(next: string) {
    setEditingTitle(false);
    const trimmed = next.trim();
    if (!trimmed || trimmed === title) return;
    const prev = title;
    setTitle(trimmed);
    const res = await fetch(`/api/whiteboards/${boardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    }).catch(() => null);
    if (!res?.ok) {
      setTitle(prev);
      toast.error("Rename failed");
    }
  }

  async function exportImage(kind: "png" | "svg") {
    const api = apiRef.current;
    if (!api) return;
    setBusy(true);
    try {
      const mod = await import("@excalidraw/excalidraw");
      const elements = api.getSceneElements();
      const appState = api.getAppState();
      const files = api.getFiles();
      if (kind === "png") {
        const blob = await (mod as unknown as {
          exportToBlob: (o: unknown) => Promise<Blob>;
        }).exportToBlob({ elements, appState, files, mimeType: "image/png" });
        downloadBlob(blob, `${title}.png`);
      } else {
        const svg = await (mod as unknown as {
          exportToSvg: (o: unknown) => Promise<SVGSVGElement>;
        }).exportToSvg({ elements, appState, files });
        const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
          type: "image/svg+xml",
        });
        downloadBlob(blob, `${title}.svg`);
      }
    } catch {
      toast.error("Export failed");
    } finally {
      setBusy(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied");
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4 py-2 border-b border-border bg-card">
      {!embedded && (
        <Link
          href="/whiteboards"
          title="All whiteboards"
          aria-label="Back to all whiteboards"
          className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
      )}
      <IconToggle onClick={onToggleLeft} title="Toggle pages">
        <PanelLeft className="w-4 h-4" />
      </IconToggle>

      <PencilLine className="w-4 h-4 text-[#d4703f] shrink-0 hidden sm:block" />
      {editingTitle ? (
        <input
          autoFocus
          defaultValue={title}
          onBlur={(e) => saveTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setEditingTitle(false);
          }}
          className="input-glass h-7 text-sm font-semibold w-[32vw] sm:w-[36vw] max-w-xs"
        />
      ) : (
        <span
          className={`font-semibold text-sm truncate max-w-[32vw] sm:max-w-[36vw] ${
            canManage ? "cursor-text hover:underline decoration-dotted underline-offset-4" : ""
          }`}
          title={canManage ? "Click to rename" : undefined}
          onClick={() => canManage && setEditingTitle(true)}
        >
          {title}
        </span>
      )}
      <span
        className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${badge.cls} flex items-center gap-1`}
      >
        {role === "VIEWER" && <Lock className="w-2.5 h-2.5" />}
        {badge.label}
      </span>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <Button size="sm" variant="ghost" onClick={() => exportImage("png")} disabled={busy}>
          <ImageIcon className="w-4 h-4" />
          <span className="hidden sm:inline">PNG</span>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => exportImage("svg")} disabled={busy}>
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">SVG</span>
        </Button>
        <Button size="sm" variant="secondary" onClick={copyLink}>
          <Link2 className="w-4 h-4" />
          <span className="hidden sm:inline">Share</span>
        </Button>
        <IconToggle onClick={onToggleRight} title="Toggle people & layers">
          <PanelRight className="w-4 h-4" />
        </IconToggle>
      </div>
    </div>
  );
}

function IconToggle({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
    >
      {children}
    </button>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
