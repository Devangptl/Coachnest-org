/**
 * Browser-safe Supabase client — anon key only.
 * Import this in Client Components instead of lib/supabase.ts,
 * which also creates the service-role admin client (server-only).
 *
 * Client is created lazily on first property access to prevent
 * "supabaseUrl is required" errors during Next.js static prerendering.
 */
import { createClient } from "@supabase/supabase-js";

type SupabaseClient = ReturnType<typeof createClient>;

let _client: SupabaseClient | null = null;

function getInstance(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}

export const supabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getInstance();
    const value  = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
