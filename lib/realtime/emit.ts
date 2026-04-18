import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import type { RealtimeEvent } from "./channels";

export async function emit(
  channel: string,
  event: RealtimeEvent,
  payload: unknown,
): Promise<void> {
  try {
    const ch = supabaseAdmin.channel(channel, { config: { broadcast: { ack: false } } });
    await ch.send({ type: "broadcast", event, payload });
    await supabaseAdmin.removeChannel(ch);
  } catch (err) {
    console.warn(`[realtime] emit ${channel}/${event} failed:`, err);
  }
}
