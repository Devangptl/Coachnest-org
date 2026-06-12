"use client";

import "@excalidraw/excalidraw/index.css";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, type ComponentType } from "react";
import toast from "react-hot-toast";
import { useWhiteboard } from "./WhiteboardProvider";
import { useWhiteboardCollab, colorForUser } from "@/hooks/useWhiteboardCollab";
import { useWhiteboardPersistence } from "@/hooks/useWhiteboardPersistence";
import { reconcileElements } from "@/lib/whiteboard/reconcile";
import type {
  BinaryFileLike,
  ExcalidrawAPI,
  PointerPayload,
  ScenePayload,
  SyncableElement,
  WhiteboardAssetDTO,
} from "@/types/whiteboard";

// Excalidraw touches `window`, so it must never render on the server. Its props
// are typed loosely here so our local ExcalidrawAPI interface (a structural
// subset of ExcalidrawImperativeAPI) doesn't fight the package's deep types.
const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((m) => m.Excalidraw),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full grid place-items-center text-sm text-muted-foreground">
        Loading canvas…
      </div>
    ),
  },
) as unknown as ComponentType<Record<string, unknown>>;

const POINTER_THROTTLE_MS = 40;
const SCENE_THROTTLE_MS = 80;

async function urlToDataURL(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function dataURLToBlob(dataURL: string): Blob {
  const [meta, b64] = dataURL.split(",");
  const mime = /:(.*?);/.exec(meta)?.[1] ?? "image/png";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export default function WhiteboardCanvas() {
  const {
    boardId,
    activePageId,
    canEdit,
    currentUser,
    role,
    setApi,
    apiRef,
    setOnlineUsers,
  } = useWhiteboard();

  // Remote cursors, keyed by userId, fed into Excalidraw's collaborators map.
  const remoteCursors = useRef<Map<string, unknown>>(new Map());
  const uploadedFileIds = useRef<Set<string>>(new Set());
  const lastPointerAt = useRef(0);
  const lastSceneAt = useRef(0);
  const activePageRef = useRef(activePageId);
  activePageRef.current = activePageId;

  const applyReconciled = useCallback(
    (incoming: SyncableElement[]) => {
      const api = apiRef.current;
      if (!api) return;
      const merged = reconcileElements(
        [...api.getSceneElementsIncludingDeleted()],
        incoming,
      );
      api.updateScene({ elements: merged });
    },
    [apiRef],
  );

  const { scheduleSave, flush, primePage } = useWhiteboardPersistence(
    boardId,
    applyReconciled,
  );

  const self = {
    userId: currentUser.userId,
    name: currentUser.name,
    avatar: currentUser.avatar,
    color: colorForUser(currentUser.userId),
    role,
  };

  const { broadcastPointer, broadcastScene } = useWhiteboardCollab({
    boardId,
    self,
    onPresence: setOnlineUsers,
    onPointer: (p: PointerPayload) => {
      const api = apiRef.current;
      if (!api || p.userId === currentUser.userId || p.pageId !== activePageRef.current) {
        return;
      }
      remoteCursors.current.set(p.userId, {
        pointer: { x: p.x, y: p.y },
        button: p.button ?? "up",
        username: p.name,
        color: { background: p.color, stroke: p.color },
      });
      api.updateScene({ collaborators: new Map(remoteCursors.current) });
    },
    onScene: (s: ScenePayload) => {
      const api = apiRef.current;
      if (!api || s.userId === currentUser.userId || s.pageId !== activePageRef.current) {
        return;
      }
      const merged = reconcileElements(
        [...api.getSceneElementsIncludingDeleted()],
        s.elements,
      );
      api.updateScene({ elements: merged });
    },
  });

  // Load the active page's elements + board assets whenever the page changes.
  useEffect(() => {
    let cancelled = false;
    remoteCursors.current.clear();

    async function load() {
      const api = apiRef.current;
      if (!api || !activePageId) return;
      try {
        const res = await fetch(
          `/api/whiteboards/${boardId}/pages/${activePageId}/elements`,
        );
        if (!res.ok || cancelled) return;
        const { elements } = (await res.json()) as { elements: SyncableElement[] };
        primePage(activePageId, elements);
        api.updateScene({ elements, collaborators: new Map() });
        await hydrateAssets(api);
      } catch {
        if (!cancelled) toast.error("Failed to load page");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePageId, boardId]);

  const hydrateAssets = useCallback(
    async (api: ExcalidrawAPI) => {
      try {
        const res = await fetch(`/api/whiteboards/${boardId}/assets`);
        if (!res.ok) return;
        const { assets } = (await res.json()) as { assets: WhiteboardAssetDTO[] };
        const existing = api.getFiles();
        const missing = assets.filter((a) => !existing[a.fileId]);
        if (missing.length === 0) return;
        const files: BinaryFileLike[] = await Promise.all(
          missing.map(async (a) => ({
            id: a.fileId,
            dataURL: await urlToDataURL(a.url),
            mimeType: a.mimeType,
            created: Date.now(),
          })),
        );
        for (const id of missing.map((m) => m.fileId)) uploadedFileIds.current.add(id);
        api.addFiles(files);
      } catch {
        // Non-fatal — images simply won't render until the next load.
      }
    },
    [boardId],
  );

  // Persist newly-added images to Cloudinary so peers/reloads can fetch them.
  const uploadNewFiles = useCallback(
    (files: Record<string, BinaryFileLike>) => {
      for (const fileId of Object.keys(files)) {
        if (uploadedFileIds.current.has(fileId)) continue;
        const file = files[fileId];
        if (!file?.dataURL?.startsWith("data:")) continue;
        uploadedFileIds.current.add(fileId);
        const blob = dataURLToBlob(file.dataURL);
        const form = new FormData();
        form.append("file", blob, `${fileId}`);
        form.append("fileId", fileId);
        fetch(`/api/whiteboards/${boardId}/assets`, { method: "POST", body: form }).catch(
          () => uploadedFileIds.current.delete(fileId),
        );
      }
    },
    [boardId],
  );

  const handleChange = useCallback(
    (
      elements: readonly SyncableElement[],
      _appState: unknown,
      files: Record<string, BinaryFileLike>,
    ) => {
      if (!canEdit) return;
      const all = [...elements];
      scheduleSave(activePageRef.current, all);

      const now = Date.now();
      if (now - lastSceneAt.current >= SCENE_THROTTLE_MS) {
        lastSceneAt.current = now;
        broadcastScene({
          userId: currentUser.userId,
          pageId: activePageRef.current,
          elements: all,
        });
      }
      if (files && Object.keys(files).length) uploadNewFiles(files);
    },
    [canEdit, scheduleSave, broadcastScene, uploadNewFiles, currentUser.userId],
  );

  const handlePointer = useCallback(
    (payload: { pointer?: { x: number; y: number }; button?: string }) => {
      const now = Date.now();
      if (now - lastPointerAt.current < POINTER_THROTTLE_MS) return;
      lastPointerAt.current = now;
      if (!payload.pointer) return;
      broadcastPointer({
        userId: currentUser.userId,
        name: currentUser.name,
        color: colorForUser(currentUser.userId),
        pageId: activePageRef.current,
        x: payload.pointer.x,
        y: payload.pointer.y,
        button: payload.button === "down" ? "down" : "up",
      });
    },
    [broadcastPointer, currentUser.userId, currentUser.name],
  );

  useEffect(() => () => flush(), [flush]);

  return (
    <div className="h-full w-full">
      <Excalidraw
        excalidrawAPI={(api: ExcalidrawAPI) => setApi(api)}
        onChange={handleChange}
        onPointerUpdate={handlePointer}
        viewModeEnabled={!canEdit}
        isCollaborating
        theme="dark"
        UIOptions={{ canvasActions: { loadScene: false } }}
      />
    </div>
  );
}
