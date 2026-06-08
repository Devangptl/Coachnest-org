"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Download, Image as ImageIcon, Link2, Lock, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useWhiteboard } from "./WhiteboardProvider";
import type { WhiteboardRole } from "@/types/whiteboard";

const ROLE_BADGE: Record<WhiteboardRole, { label: string; cls: string }> = {
  OWNER: { label: "Owner", cls: "bg-amber-500/15 text-amber-400 border-amber-400/25" },
  EDITOR: { label: "Editor", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-400/25" },
  VIEWER: { label: "View only", cls: "bg-secondary text-muted-foreground border-border" },
};

export default function WhiteboardTopbar() {
  const { title, role, apiRef } = useWhiteboard();
  const [busy, setBusy] = useState(false);
  const badge = ROLE_BADGE[role];

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
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card">
      <PencilLine className="w-4 h-4 text-[#d4703f]" />
      <span className="font-semibold text-sm truncate max-w-[40vw]">{title}</span>
      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badge.cls} flex items-center gap-1`}>
        {role === "VIEWER" && <Lock className="w-2.5 h-2.5" />}
        {badge.label}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => exportImage("png")} disabled={busy}>
          <ImageIcon className="w-4 h-4" /> PNG
        </Button>
        <Button size="sm" variant="ghost" onClick={() => exportImage("svg")} disabled={busy}>
          <Download className="w-4 h-4" /> SVG
        </Button>
        <Button size="sm" variant="secondary" onClick={copyLink}>
          <Link2 className="w-4 h-4" /> Share
        </Button>
      </div>
    </div>
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
