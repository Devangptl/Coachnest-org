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
 *  8. Guard /org/[slug]/* portals by org-membership claims (app_metadata.orgs);
 *     authoritative checks happen in org layouts + lib/org-auth.ts.
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

  // Expose the current pathname to Server Components / Layouts via a
  // request header — used by /instructor/layout.tsx to allow STUDENT users
  // through to /instructor/invitations specifically.
  req.headers.set("x-pathname", pathname);
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

  // ── 0b. Organization workspaces — /org/[slug]/* ────────────────────────────
  // Claims-only checks (Edge has no DB access): org memberships are mirrored
  // into app_metadata.orgs as { slug: role } by lib/org-metadata.ts. These
  // redirects are navigation hints; org layouts + lib/org-auth.ts do the
  // authoritative DB-backed checks.
  if (pathname === "/org" || pathname === "/org/") {
    return NextResponse.redirect(new URL("/org/register", req.url));
  }
  if (underPath(pathname, "/org") && !underPath(pathname, "/org/register")) {
    const [, , slug, portal] = pathname.split("/"); // /org/{slug}/{portal}
    const orgs    = (user?.app_metadata?.orgs ?? {}) as Record<string, string>;
    const orgRole = slug ? orgs[slug] : undefined;
    const isSuperAdmin =
      !!user && role === "ADMIN" && (adminSubRole ?? "SUPER_ADMIN") === "SUPER_ADMIN";
    const orgHome =
      orgRole === "ORG_ADMIN" || isSuperAdmin ? `/org/${slug}/admin` :
      orgRole === "ORG_INSTRUCTOR"            ? `/org/${slug}/instructor` :
      `/org/${slug}/student`;

    if (portal === "login") {
      // Members landing on org login go straight to their portal.
      if (user && (orgRole || isSuperAdmin)) {
        return NextResponse.redirect(new URL(orgHome, req.url));
      }
      return res;
    }

    if (!user) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = `/org/${slug}/login`;
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!orgRole && !isSuperAdmin) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = `/org/${slug}/login`;
      loginUrl.searchParams.set("error", "not_member");
      return NextResponse.redirect(loginUrl);
    }

    if (!portal) return NextResponse.redirect(new URL(orgHome, req.url));
    if (portal === "admin" && !(orgRole === "ORG_ADMIN" || isSuperAdmin)) {
      return NextResponse.redirect(new URL(orgHome, req.url));
    }
    if (
      portal === "instructor" &&
      !(orgRole === "ORG_ADMIN" || orgRole === "ORG_INSTRUCTOR" || isSuperAdmin)
    ) {
      return NextResponse.redirect(new URL(orgHome, req.url));
    }
    // student portal + expired page: any member
    return res;
  }

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

    // /instructor — INSTRUCTOR and ADMIN only. Exception: any authenticated
    // user (including STUDENT) must be able to land on /instructor/invitations
    // so they can accept a collaboration invite — acceptance auto-promotes
    // them to INSTRUCTOR (see services/collaboration.service.ts acceptInvite).
    if (
      underPath(pathname, "/instructor") &&
      role === "STUDENT" &&
      !underPath(pathname, "/instructor/invitations")
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // /instructor — pending/rejected instructors can only access
    // /instructor/pending or /instructor/invitations (same reason as above).
    if (
      underPath(pathname, "/instructor") &&
      isInstructorPending &&
      !underPath(pathname, "/instructor/pending") &&
      !underPath(pathname, "/instructor/invitations")
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
