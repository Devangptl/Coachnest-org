/**
 * Next.js Middleware — runs on the Edge before every matched request.
 *
 * Uses @supabase/ssr to refresh the Supabase session token and protect routes.
 *
 * This is the organization-only tenant app. Responsibilities:
 *  1. Refresh the Supabase access token if it is near expiry (via getUser).
 *  2. Guard /org/[slug]/* portals by org-membership claims (app_metadata.orgs);
 *     authoritative checks happen in org layouts + lib/org-auth.ts.
 *  3. Guard /admin (platform super-admin org management) for ADMIN only, scoped
 *     by admin sub-role permissions.
 *  4. Prevent authenticated users from hitting /login.
 */
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { canAccessAdminPath, type AdminSubRole } from "@/lib/admin-permissions";

const PROTECTED  = ["/admin"];
const AUTH_ONLY  = ["/login"];

/** Segment-aware prefix match: "/instructor" matches "/instructor" and
 *  "/instructor/x" but NOT the public "/instructors/[id]" page. */
const underPath = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(base + "/");

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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

  const role         = (user?.app_metadata?.role ?? "STUDENT") as string;
  const adminSubRole = (user?.app_metadata?.adminSubRole ?? null) as AdminSubRole | null;

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

  // ── 1. Protect /admin (platform super-admin org management) ────────────────
  if (PROTECTED.some((p) => underPath(pathname, p))) {
    if (!user) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // /admin — ADMIN only.
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/org/register", req.url));
    }

    // /admin sub-section — must match the admin's sub-role permissions.
    // Existing admins without a sub-role default to SUPER_ADMIN (full access).
    const effectiveSubRole: AdminSubRole = adminSubRole ?? "SUPER_ADMIN";
    if (!canAccessAdminPath(effectiveSubRole, pathname)) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  // ── 2. Redirect authenticated users away from auth pages ──────────────────
  if (AUTH_ONLY.includes(pathname) && user) {
    return NextResponse.redirect(
      new URL(role === "ADMIN" ? "/admin" : "/org/register", req.url)
    );
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|otf|mp4|mp3|pdf)).*)",
  ],
};
