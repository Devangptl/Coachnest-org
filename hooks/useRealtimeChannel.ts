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
    const ch = (supabaseClient as any).channel(channel, {
      config: { broadcast: { self: false } },
    });

    for (const event of Object.keys(handlers)) {
      ch.on("broadcast", { event }, (msg: { payload: unknown }) => {
        handlers[event]?.(msg.payload);
      });
    }

    ch.subscribe((status: string) => {
      if (status === "CHANNEL_ERROR") {
        console.warn(`[realtime] channel error: ${channel}`);
      }
    });

    return () => {
      (supabaseClient as any).removeChannel(ch);
    };
  }, [channel]);
}

/**
 * Subscribe to Postgres table-level changes (INSERT / UPDATE / DELETE / *).
 * Works because Supabase has Realtime replication enabled on the target table.
 *
 * The handler is called with the new row on INSERT/UPDATE, and the old row on DELETE.
 * Use `filter` to scope to specific rows, e.g. `user_id=eq.${userId}`.
 */
export function usePostgresChanges(
  table: string,
  handler: EventHandler,
  {
    event  = "*",
    schema = "public",
    filter,
  }: {
    event?:  "INSERT" | "UPDATE" | "DELETE" | "*";
    schema?: string;
    filter?: string;
  } = {},
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const ch = (supabaseClient as any).channel(`pg:${table}:${event}:${filter ?? "all"}`);

    ch.on(
      "postgres_changes",
      {
        event,
        schema,
        table,
        ...(filter ? { filter } : {}),
      },
      (payload: { eventType: string; new?: unknown; old?: unknown }) => {
        const row = payload.eventType === "DELETE" ? payload.old : payload.new;
        handlerRef.current(row);
      },
    );

    ch.subscribe((status: string) => {
      if (status === "CHANNEL_ERROR") {
        console.warn(`[realtime] postgres_changes error on ${table}`);
      }
    });

    return () => {
      (supabaseClient as any).removeChannel(ch);
    };
  }, [table, event, schema, filter]);
}
