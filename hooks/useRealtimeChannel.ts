"use client";
import { useEffect, useRef } from "react";
import { supabaseClient } from "@/lib/supabase/client";

type EventHandler = (payload: unknown) => void;

/**
 * Subscribe to a Supabase Realtime broadcast channel.
 *
 * Pass either a single event name or a map of event -> handler to listen to
 * multiple events on the same channel with one subscription.
 *
 * The channel is unsubscribed on unmount or whenever `channel` changes.
 * If `channel` is null/undefined, no subscription is created — useful while
 * waiting for a user id or route param to become available.
 */
export function useRealtimeChannel(
  channel: string | null | undefined,
  eventOrMap: string | Record<string, EventHandler>,
  onEvent?: EventHandler,
) {
  const handlersRef = useRef<Record<string, EventHandler>>({});

  if (typeof eventOrMap === "string") {
    handlersRef.current = onEvent ? { [eventOrMap]: onEvent } : {};
  } else {
    handlersRef.current = eventOrMap;
  }

  useEffect(() => {
    if (!channel) return;

    const handlers = handlersRef.current;
    const ch = (supabaseClient as any).channel(channel);

    for (const event of Object.keys(handlers)) {
      ch.on("broadcast", { event }, (msg: { payload: unknown }) => {
        handlers[event]?.(msg.payload);
      });
    }

    ch.subscribe();

    return () => {
      (supabaseClient as any).removeChannel(ch);
    };
  }, [channel]);
}
