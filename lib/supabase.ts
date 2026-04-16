/**
 * Supabase client instances.
 *
 * `supabase`      — uses the anon key. Safe for auth operations (signUp, signIn).
 * `supabaseAdmin` — uses the service role key. Bypasses RLS. SERVER ONLY.
 *
 * Clients are created lazily on first property access so that importing this
 * module at build time (when env vars may be absent) does not throw.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabase:      SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabase;
}

function getAdminClient(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}

function makeProxy(factory: () => SupabaseClient): SupabaseClient {
  return new Proxy({} as SupabaseClient, {
    get(_, prop) {
      const client = factory();
      const value  = (client as any)[prop];
      return typeof value === "function" ? value.bind(client) : value;
    },
  });
}

export const supabase      = makeProxy(getClient);
export const supabaseAdmin = makeProxy(getAdminClient);
