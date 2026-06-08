"use client";

import { useCallback, useEffect, useRef } from "react";
import { diffElements } from "@/lib/whiteboard/reconcile";
import type { ElementSyncInput, SyncableElement } from "@/types/whiteboard";

const DEBOUNCE_MS = 800;

/**
 * Debounced, incremental persistence of a page's elements.
 *
 * Tracks the last-saved version per element and only ships what changed
 * (including newly-deleted elements, which Excalidraw bumps + flags). The server
 * may return `reconciled` elements when it holds a newer copy; those are handed
 * back so the canvas can adopt the authoritative state.
 */
export function useWhiteboardPersistence(
  boardId: string,
  onReconciled?: (elements: SyncableElement[]) => void,
) {
  // pageId -> (elementId -> last saved version)
  const versions = useRef<Map<string, Map<string, number>>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ pageId: string; elements: SyncableElement[] } | null>(null);
  const reconciledCb = useRef(onReconciled);
  reconciledCb.current = onReconciled;

  const versionsFor = (pageId: string) => {
    let m = versions.current.get(pageId);
    if (!m) {
      m = new Map();
      versions.current.set(pageId, m);
    }
    return m;
  };

  /** Seed the version map after a page loads so loaded elements aren't re-saved. */
  const primePage = useCallback((pageId: string, elements: SyncableElement[]) => {
    const m = new Map<string, number>();
    for (const el of elements) m.set(el.id, el.version);
    versions.current.set(pageId, m);
  }, []);

  const save = useCallback(
    async (pageId: string, elements: SyncableElement[]) => {
      const m = versionsFor(pageId);
      const changed = diffElements(elements, m);
      if (changed.length === 0) return;

      const payload: ElementSyncInput[] = changed.map((el) => ({
        elementId: el.id,
        type: el.type,
        data: el,
        version: el.version,
        isDeleted: !!el.isDeleted,
      }));

      try {
        const res = await fetch(
          `/api/whiteboards/${boardId}/pages/${pageId}/elements`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ elements: payload }),
          },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { reconciled?: SyncableElement[] };
        for (const el of changed) m.set(el.id, el.version);
        if (data.reconciled?.length) {
          for (const el of data.reconciled) m.set(el.id, el.version);
          reconciledCb.current?.(data.reconciled);
        }
      } catch {
        // Network hiccup — keep versions unchanged so the next tick retries.
      }
    },
    [boardId],
  );

  const scheduleSave = useCallback(
    (pageId: string, elements: SyncableElement[]) => {
      pending.current = { pageId, elements };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const p = pending.current;
        pending.current = null;
        if (p) void save(p.pageId, p.elements);
      }, DEBOUNCE_MS);
    },
    [save],
  );

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    const p = pending.current;
    pending.current = null;
    if (p) void save(p.pageId, p.elements);
  }, [save]);

  useEffect(() => () => flush(), [flush]);

  return { scheduleSave, flush, primePage };
}
