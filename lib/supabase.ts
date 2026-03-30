/**
 * Supabase client instances.
 *
 * `supabase`      — uses the anon key. Safe for auth operations (signUp, signIn).
 * `supabaseAdmin` — uses the service role key. Bypasses RLS. SERVER ONLY.
 */
import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase      = createClient(url, anon);
export const supabaseAdmin = createClient(url, svc);
