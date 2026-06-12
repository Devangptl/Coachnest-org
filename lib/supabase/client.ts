/**
 * Browser-safe Supabase client — anon key only.
 * Uses createBrowserClient from @supabase/ssr so that the PKCE code
 * verifier is stored in cookies (not localStorage), allowing the
 * server-side SSR client to read it during the OAuth callback.
 */
import { createBrowserClient } from "@supabase/ssr";

type SupabaseClient = ReturnType<typeof createBrowserClient>;

let _client: SupabaseClient | null = null;

function getInstance(): SupabaseClient {
  if (!_client) {
    _client = createBrowserClient(
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
