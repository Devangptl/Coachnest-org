import "server-only";
import type { RealtimeEvent } from "./channels";

/**
 * Broadcast a realtime event via the Supabase Realtime REST API.
 *
 * Uses a plain fetch instead of the JS client so no subscription/channel
 * lifecycle is needed on the server — the previous approach called ch.send()
 * before the channel was SUBSCRIBED, which silently dropped every message.
 */
export async function emit(
  channel: string,
  event: RealtimeEvent,
  payload: unknown,
): Promise<void> {
  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "apikey":        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      body: JSON.stringify({
        messages: [{ topic: channel, event, payload }],
      }),
    });
    if (!res.ok) {
      console.warn(`[realtime] emit ${channel}/${event} failed:`, await res.text());
    }
  } catch (err) {
    console.warn(`[realtime] emit ${channel}/${event} failed:`, err);
  }
}
