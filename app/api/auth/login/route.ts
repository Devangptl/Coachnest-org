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

    if (error) {
      if (error.code === "email_not_confirmed") {
        return NextResponse.json(
          { error: "email_not_confirmed", email },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const role             = (data.user.app_metadata?.role ?? "STUDENT") as string;
    const instructorStatus = (data.user.app_metadata?.instructorStatus ?? null) as string | null;

    return NextResponse.json({ message: "Logged in.", role, instructorStatus });
  } catch (error) {
    console.error("[login]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
