/**
 * Next.js Middleware — runs on the Edge before every matched request.
 *
 * Responsibilities:
 *  1. Protect /dashboard and /admin routes (redirect to /login if no session).
 *  2. Prevent authenticated users from hitting /login or /signup.
 *  3. Guard /admin to admins-only (redirect students to /dashboard).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

// Routes that require authentication
const PROTECTED = ["/dashboard", "/admin"];

// Routes only for unauthenticated users
const AUTH_ONLY = ["/login", "/signup"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await getSessionFromRequest(req);

  // ── Protect dashboard + admin ─────────────────────────────────────────────
  if (PROTECTED.some((p) => pathname.startsWith(p))) {
    if (!session) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Only admins and instructors may access /admin
    if (pathname.startsWith("/admin") && session.role === "STUDENT") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // ── Redirect authenticated users away from auth pages ─────────────────────
  if (AUTH_ONLY.includes(pathname) && session) {
    const dest = session.role === "STUDENT" ? "/dashboard" : "/admin";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on all routes except static assets and Next internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
