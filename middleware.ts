/**
 * Next.js Middleware — runs on the Edge before every matched request.
 *
 * Uses @supabase/ssr to refresh the Supabase session token and protect routes.
 *
 * Responsibilities:
 *  1. Refresh the Supabase access token if it is near expiry (via getUser).
 *  2. Protect /dashboard and /admin routes — redirect to /login if no session.
 *  3. Prevent authenticated users from hitting /login or /signup.
 *  4. Guard /admin to admins and instructors only.
 */
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const PROTECTED = ["/dashboard", "/admin"];
const AUTH_ONLY  = ["/login", "/signup"];

export async function middleware(req: NextRequest) {
  // Start with a passthrough response — we may swap it out below
  let res = NextResponse.next({ request: req });

  // Create a Supabase client that can read and refresh cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          // Write refreshed tokens to both the request and the response
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Validate the session — also refreshes the access token when needed
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;
  const role = (user?.app_metadata?.role ?? "STUDENT") as string;

  // ── 1. Protect dashboard + admin ─────────────────────────────────────────
  if (PROTECTED.some((p) => pathname.startsWith(p))) {
    if (!user) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Only ADMIN and INSTRUCTOR may access /admin
    if (pathname.startsWith("/admin") && role === "STUDENT") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // ── 2. Redirect authenticated users away from auth pages ─────────────────
  if (AUTH_ONLY.includes(pathname) && user) {
    const dest = role === "STUDENT" ? "/dashboard" : "/admin";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
