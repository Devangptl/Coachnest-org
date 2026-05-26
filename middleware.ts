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
import { canAccessAdminPath, type AdminSubRole } from "@/lib/admin-permissions";

const PROTECTED  = ["/dashboard", "/admin", "/instructor", "/onboarding"];
const AUTH_ONLY  = ["/login", "/signup"];

/** Segment-aware prefix match: "/instructor" matches "/instructor" and
 *  "/instructor/x" but NOT the public "/instructors/[id]" page. */
const underPath = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(base + "/");

// Paths that stay at their canonical location on EITHER host. On the books
// subdomain, anything outside this set is rewritten to /books/<rest>.
const BOOKS_PASSTHROUGH = [
  "/cart", "/checkout", "/dashboard", "/admin", "/instructor",
  "/login", "/signup", "/onboarding", "/launch",
  "/api", "/_next", "/auth", "/about", "/contact",
  "/legal", "/blog", "/press", "/careers", "/search",
];

const isBooksHost = (host: string, configuredHost: string): boolean => {
  if (host === configuredHost) return true;
  // Dev convenience: books.localhost[:port]
  if (host.startsWith("books.localhost")) return true;
  return false;
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── -1. Books subdomain rewrite ─────────────────────────────────────────
  // Maps `books.<domain>/<path>` → `<domain>/books/<path>` internally while
  // keeping the user-visible URL on the subdomain. Inverse 308 redirect on
  // the apex prevents duplicate-content SEO.
  const host = req.headers.get("host") ?? "";
  const configuredBooksHost =
    process.env.NEXT_PUBLIC_BOOKS_HOST ?? "books.coachnest.com";
  const onBooksSubdomain = isBooksHost(host, configuredBooksHost);

  if (onBooksSubdomain) {
    const isPassthrough = BOOKS_PASSTHROUGH.some((p) => underPath(pathname, p));
    if (!isPassthrough) {
      const url = req.nextUrl.clone();
      url.pathname = pathname === "/" ? "/books" : `/books${pathname}`;
      return NextResponse.rewrite(url);
    }
  } else {
    // Inverse: redirect apex /books and /books/* to the canonical subdomain.
    // Only applies in production-like environments where BOOKS_HOST is set
    // to a different value than the current host.
    const booksHostConfigured = !!process.env.NEXT_PUBLIC_BOOKS_HOST;
    if (booksHostConfigured && host !== configuredBooksHost) {
      if (pathname === "/books") {
        return NextResponse.redirect(
          new URL("/", `https://${configuredBooksHost}`),
          308,
        );
      }
      if (pathname.startsWith("/books/")) {
        const slug = pathname.slice("/books/".length);
        return NextResponse.redirect(
          new URL(`/${slug}`, `https://${configuredBooksHost}`),
          308,
        );
      }
    }
  }

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

  const role             = (user?.app_metadata?.role ?? "STUDENT") as string;
  const adminSubRole     = (user?.app_metadata?.adminSubRole ?? null) as AdminSubRole | null;
  const instructorStatus = (user?.app_metadata?.instructorStatus ?? null) as string | null;
  const isInstructorPending =
    role === "INSTRUCTOR" &&
    (instructorStatus === "PENDING" || instructorStatus === "REJECTED");

  // ── 1. Protect dashboard + admin + instructor ─────────────────────────────
  if (PROTECTED.some((p) => underPath(pathname, p))) {
    if (!user) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // /admin — ADMIN only (INSTRUCTOR has their own /instructor portal)
    if (underPath(pathname, "/admin") && role !== "ADMIN") {
      const dest = isInstructorPending ? "/instructor/pending" : role === "INSTRUCTOR" ? "/instructor" : "/dashboard";
      return NextResponse.redirect(new URL(dest, req.url));
    }

    // /admin sub-section — must match the admin's sub-role permissions.
    // Existing admins without a sub-role default to SUPER_ADMIN (full access).
    if (underPath(pathname, "/admin") && role === "ADMIN") {
      const effectiveSubRole: AdminSubRole = adminSubRole ?? "SUPER_ADMIN";
      if (!canAccessAdminPath(effectiveSubRole, pathname)) {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
    }

    // /instructor — INSTRUCTOR and ADMIN only
    if (underPath(pathname, "/instructor") && role === "STUDENT") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // /instructor — pending/rejected instructors can only access /instructor/pending
    if (
      underPath(pathname, "/instructor") &&
      isInstructorPending &&
      !underPath(pathname, "/instructor/pending")
    ) {
      return NextResponse.redirect(new URL("/instructor/pending", req.url));
    }

    // /dashboard — STUDENT only (instructors + admins have their own portals)
    if (underPath(pathname, "/dashboard") && role === "INSTRUCTOR") {
      const dest = isInstructorPending ? "/instructor/pending" : "/instructor";
      return NextResponse.redirect(new URL(dest, req.url));
    }
  }

  // ── 2. Redirect authenticated users away from auth pages ──────────────────
  if (AUTH_ONLY.includes(pathname) && user) {
    let dest = "/dashboard";
    if (role === "INSTRUCTOR") dest = isInstructorPending ? "/instructor/pending" : "/instructor";
    if (role === "ADMIN")      dest = "/admin";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|otf|mp4|mp3|pdf)).*)",
  ],
};
