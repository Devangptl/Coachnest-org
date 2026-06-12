"use client";

import { useCallback, useEffect, useRef } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { channels, events } from "@/lib/realtime/channels";
import type { OnlineUser } from "@/components/whiteboard/WhiteboardProvider";
import type { PointerPayload, ScenePayload, WhiteboardRole } from "@/types/whiteboard";

const CURSOR_PALETTE = [
  "#d4703f", "#3f8fd4", "#3fd47a", "#d43f8f", "#9b59b6",
  "#e67e22", "#1abc9c", "#e74c3c", "#2ecc71", "#f1c40f",
];

/** Deterministic per-user cursor color so peers agree on colors. */
export function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  return CURSOR_PALETTE[Math.abs(hash) % CURSOR_PALETTE.length];
}

interface CollabParams {
  boardId: string;
  self: OnlineUser;
  onPresence: (users: OnlineUser[]) => void;
  onPointer: (payload: PointerPayload) => void;
  onScene: (payload: ScenePayload) => void;
}

interface CollabApi {
  broadcastPointer: (payload: PointerPayload) => void;
  broadcastScene: (payload: ScenePayload) => void;
}

/**
 * Opens one Supabase Realtime channel per board carrying:
 *   - presence  (who's online → presence indicators / collaborator panel)
 *   - pointer   (live cursors, high frequency, client→client)
 *   - scene     (incremental element broadcasts, client→client)
 *
 * Broadcasts go directly through the channel (not the server `emit` helper) so
 * cursor/stroke latency stays low. Durable persistence is handled separately by
 * the debounced REST save.
 */
export function useWhiteboardCollab({
  boardId,
  self,
  onPresence,
  onPointer,
  onScene,
}: CollabParams): CollabApi {
  // Keep latest handlers without re-subscribing the channel.
  const handlers = useRef({ onPresence, onPointer, onScene, self });
  handlers.current = { onPresence, onPointer, onScene, self };

  const channelRef = useRef<ReturnType<typeof supabaseClient.channel> | null>(null);

  useEffect(() => {
    const name = channels.whiteboard(boardId);
    const ch = supabaseClient.channel(name, {
      config: {
        broadcast: { self: false },
        presence: { key: handlers.current.self.userId },
      },
    });
    channelRef.current = ch;

    const syncPresence = () => {
      const state = ch.presenceState() as Record<string, OnlineUser[]>;
      const users: OnlineUser[] = [];
      const seen = new Set<string>();
      for (const key of Object.keys(state)) {
        const meta = state[key]?.[0];
        if (meta && !seen.has(meta.userId)) {
          seen.add(meta.userId);
          users.push(meta);
        }
      }
      handlers.current.onPresence(users);
    };

    ch.on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .on("broadcast", { event: events.whiteboardPointerUpdate }, (msg: { payload: unknown }) =>
        handlers.current.onPointer(msg.payload as PointerPayload),
      )
      .on("broadcast", { event: events.whiteboardSceneUpdate }, (msg: { payload: unknown }) =>
        handlers.current.onScene(msg.payload as ScenePayload),
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          ch.track(handlers.current.self);
        }
      });

    return () => {
      supabaseClient.removeChannel(ch);
      channelRef.current = null;
    };
  }, [boardId]);

  const broadcastPointer = useCallback((payload: PointerPayload) => {
    channelRef.current?.send({
      type: "broadcast",
      event: events.whiteboardPointerUpdate,
      payload,
    });
  }, []);

  const broadcastScene = useCallback((payload: ScenePayload) => {
    channelRef.current?.send({
      type: "broadcast",
      event: events.whiteboardSceneUpdate,
      payload,
    });
  }, []);

  return { broadcastPointer, broadcastScene };
}

export type { WhiteboardRole };
