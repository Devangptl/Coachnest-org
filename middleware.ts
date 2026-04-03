/**
 * Next.js Middleware — runs on the Edge before every matched request.
 *
 * Uses @supabase/ssr to refresh the Supabase session token and protect routes.
 *
 * Responsibilities:
 *  0. Launch mode (NEXT_PUBLIC_LAUNCH_MODE=true) — redirect everything to /launch;
 *     when false, /launch itself redirects to /.
 *  1. Refresh the Supabase access token if it is near expiry (via getUser).
 *  2. Protect /dashboard, /admin, /instructor routes — redirect to /login if no session.
 *  3. Prevent authenticated users from hitting /login or /signup.
 *  4. Guard /admin for ADMIN only.
 *  5. Guard /instructor for INSTRUCTOR only (ADMIN can visit too).
 *  6. Redirect INSTRUCTOR away from /dashboard → /instructor.
 *  7. Redirect STUDENT away from /admin and /instructor → /dashboard.
 */
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const PROTECTED  = ["/dashboard", "/admin", "/instructor"];
const AUTH_ONLY  = ["/login", "/signup"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── 0. Launch / Coming-Soon mode ─────────────────────────────────────────
  const LAUNCH_MODE = process.env.NEXT_PUBLIC_LAUNCH_MODE === "true";

  if (LAUNCH_MODE) {
    // Allow /launch through; redirect everything else to /launch
    if (!pathname.startsWith("/launch")) {
      return NextResponse.redirect(new URL("/launch", req.url));
    }
    return NextResponse.next({ request: req });
  }

  // When not in launch mode, block direct access to /launch
  if (pathname.startsWith("/launch")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const role = (user?.app_metadata?.role ?? "STUDENT") as string;

  // ── 1. Protect dashboard + admin + instructor ─────────────────────────────
  if (PROTECTED.some((p) => pathname.startsWith(p))) {
    if (!user) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // /admin — ADMIN only (INSTRUCTOR has their own /instructor portal)
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      const dest = role === "INSTRUCTOR" ? "/instructor" : "/dashboard";
      return NextResponse.redirect(new URL(dest, req.url));
    }

    // /instructor — INSTRUCTOR and ADMIN only
    if (pathname.startsWith("/instructor") && role === "STUDENT") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // /dashboard — STUDENT only (instructors + admins have their own portals)
    if (pathname.startsWith("/dashboard") && role === "INSTRUCTOR") {
      return NextResponse.redirect(new URL("/instructor", req.url));
    }
  }

  // ── 2. Redirect authenticated users away from auth pages ──────────────────
  if (AUTH_ONLY.includes(pathname) && user) {
    let dest = "/dashboard";
    if (role === "INSTRUCTOR") dest = "/instructor";
    if (role === "ADMIN")      dest = "/admin";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
