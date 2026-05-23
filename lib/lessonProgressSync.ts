/**
 * Client-side helpers for persisting in-progress lesson activity
 * (reading time, video watch seconds) to `/api/progress`.
 *
 * Designed for fire-and-forget use from React effects:
 *   • `syncWatchedSecsToServer` — POSTs `watchedSecs` without touching
 *     `completed` (the server preserves existing completion state).
 *     Uses `navigator.sendBeacon` when called during page unload.
 *   • `fetchSavedWatchedSecs`   — GETs the user's stored value so the
 *     UI can resume from wherever any session left off.
 */

export interface SavedProgress { watchedSecs: number; completed: boolean }

export async function fetchSavedWatchedSecs(lessonId: string): Promise<SavedProgress | null> {
  try {
    const res = await fetch(`/api/progress?lessonId=${encodeURIComponent(lessonId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      watchedSecs: Math.max(0, Number(data.watchedSecs) || 0),
      completed:   Boolean(data.completed),
    };
  } catch {
    return null;
  }
}

export function syncWatchedSecsToServer(
  lessonId: string,
  watchedSecs: number,
  opts: { beacon?: boolean } = {},
) {
  if (typeof window === "undefined" || watchedSecs <= 0) return;
  const payload = JSON.stringify({ lessonId, watchedSecs });

  if (opts.beacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
    try {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon("/api/progress", blob)) return;
    } catch {
      // Fall through to keepalive fetch.
    }
  }

  try {
    fetch("/api/progress", {
      method:    "POST",
      headers:   { "Content-Type": "application/json" },
      body:      payload,
      keepalive: true,
    }).catch(() => {});
  } catch {}
}
