/**
 * POST /api/auth/login
 * Signs in with Supabase Auth. Session cookies are set automatically.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const role = (data.user.app_metadata?.role ?? "STUDENT") as string;

    return NextResponse.json({ message: "Logged in.", role });
  } catch (error) {
    console.error("[login]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
