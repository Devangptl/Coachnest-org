/**
 * POST /api/auth/logout
 * Signs out from Supabase Auth and clears the session cookies.
 */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.json({ message: "Logged out." });
}
