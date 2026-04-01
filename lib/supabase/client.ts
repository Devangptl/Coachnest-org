/**
 * Browser-safe Supabase client — anon key only.
 * Import this in Client Components instead of lib/supabase.ts,
 * which also creates the service-role admin client (server-only).
 */
import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseClient = createClient(url, anon);
