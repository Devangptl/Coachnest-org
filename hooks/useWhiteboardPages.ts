"use client";

import { useCallback } from "react";
import toast from "react-hot-toast";
import { useWhiteboard } from "@/components/whiteboard/WhiteboardProvider";
import type { WhiteboardPageDTO } from "@/types/whiteboard";

/**
 * Page CRUD actions backed by the REST API, keeping the provider's `pages`
 * state in sync. Other open sessions converge via the realtime page-changed
 * event (handled in the canvas).
 */
export function useWhiteboardPages() {
  const { boardId, pages, setPages, activePageId, setActivePageId } = useWhiteboard();

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/whiteboards/${boardId}`);
    if (!res.ok) return;
    const data = (await res.json()) as { whiteboard: { pages: WhiteboardPageDTO[] } };
    setPages(data.whiteboard.pages);
  }, [boardId, setPages]);

  const createPage = useCallback(async () => {
    const res = await fetch(`/api/whiteboards/${boardId}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      toast.error("Couldn't add page");
      return;
    }
    const { page } = (await res.json()) as { page: WhiteboardPageDTO };
    setPages((prev) => [...prev, page]);
    setActivePageId(page.id);
  }, [boardId, setPages, setActivePageId]);

  const duplicatePage = useCallback(
    async (pageId: string) => {
      const res = await fetch(
        `/api/whiteboards/${boardId}/pages/${pageId}/duplicate`,
        { method: "POST" },
      );
      if (!res.ok) {
        toast.error("Couldn't duplicate page");
        return;
      }
      const { page } = (await res.json()) as { page: WhiteboardPageDTO };
      setPages((prev) => [...prev, page]);
      setActivePageId(page.id);
    },
    [boardId, setPages, setActivePageId],
  );

  const deletePage = useCallback(
    async (pageId: string) => {
      if (pages.length <= 1) {
        toast.error("A whiteboard needs at least one page");
        return;
      }
      const res = await fetch(`/api/whiteboards/${boardId}/pages/${pageId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Couldn't delete page");
        return;
      }
      setPages((prev) => {
        const next = prev.filter((p) => p.id !== pageId);
        if (activePageId === pageId && next[0]) setActivePageId(next[0].id);
        return next;
      });
    },
    [boardId, pages.length, activePageId, setPages, setActivePageId],
  );

  const renamePage = useCallback(
    async (pageId: string, title: string) => {
      setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, title } : p)));
      await fetch(`/api/whiteboards/${boardId}/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
    },
    [boardId, setPages],
  );

  const reorderPages = useCallback(
    async (orderedIds: string[]) => {
      setPages((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        return orderedIds
          .map((id, idx) => {
            const p = map.get(id);
            return p ? { ...p, order: idx } : null;
          })
          .filter((p): p is WhiteboardPageDTO => p !== null);
      });
      await fetch(`/api/whiteboards/${boardId}/pages/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageIds: orderedIds }),
      });
    },
    [boardId, setPages],
  );

  return { refresh, createPage, duplicatePage, deletePage, renamePage, reorderPages };
}
