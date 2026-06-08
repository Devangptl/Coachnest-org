"use client";

import { useEffect, useState } from "react";
import { ExternalLink, PencilRuler } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Drop-in panel that resolves (creating if needed) the whiteboard attached to
 * an LMS surface and embeds it. Reused across Live Classes, Courses, Lessons,
 * Assignments, Group Projects — the only per-surface difference is `resolveUrl`,
 * a GET endpoint returning `{ whiteboardId }`.
 *
 *   <WhiteboardLauncher resolveUrl={`/api/classes/${classId}/whiteboard`} />
 */
export default function WhiteboardLauncher({
  resolveUrl,
  heightClass = "h-[60vh] sm:h-[70vh] min-h-[400px]",
}: {
  resolveUrl: string;
  heightClass?: string;
}) {
  const [boardId, setBoardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(resolveUrl);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Could not open the whiteboard");
          return;
        }
        setBoardId(data.whiteboardId);
      } catch {
        if (!cancelled) setError("Could not open the whiteboard");
      }
    })();
    return () => { cancelled = true; };
  }, [resolveUrl]);

  if (error) {
    return <div className="text-sm text-muted-foreground text-center py-8">{error}</div>;
  }

  if (!boardId) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <PencilRuler className="w-4 h-4 animate-pulse" /> Preparing whiteboard…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <a href={`/whiteboards/${boardId}`} target="_blank" rel="noreferrer">
          <Button size="sm" variant="secondary">
            <ExternalLink className="w-4 h-4" /> Open full screen
          </Button>
        </a>
      </div>
      <iframe
        src={`/whiteboards/${boardId}`}
        title="Whiteboard"
        className={`w-full rounded-lg border border-border bg-card ${heightClass}`}
      />
    </div>
  );
}
