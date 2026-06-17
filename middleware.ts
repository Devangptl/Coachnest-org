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
import { ORG_ADMIN_AREA_ROLES, ORG_AUTHOR_ROLES } from "@/lib/org-permissions";
import { isApexHost, cookieDomainForHost, mainHostUrl, tenantSlugFromHost } from "@/lib/domains";
import type { OrgRole } from "@/lib/generated/prisma/client";

const PROTECTED  = ["/admin"];
const AUTH_ONLY  = ["/login"];

/** Segment-aware prefix match: "/instructor" matches "/instructor" and
 *  "/instructor/x" but NOT the public "/instructors/[id]" page. */
const underPath = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(base + "/");

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host");

  // ── 0a. Apex / www → canonical platform host ───────────────────────────────
  // coachnest.in and www.coachnest.in always live on org.coachnest.in. (Inert
  // in dev: localhost is never the apex of the configured root domain.)
  if (isApexHost(host)) {
    return NextResponse.redirect(mainHostUrl(req.nextUrl.pathname + req.nextUrl.search));
  }

  // ── 0b. Tenant subdomain → /org/[slug] route space ─────────────────────────
  // <slug>.coachnest.in serves an organization workspace. Two-way mapping:
  //   • Absolute /org/<slug>/* links the app emits are bounced to their clean,
  //     prefix-stripped equivalent so the address bar stays tidy.
  //   • Clean tenant URLs (/, /login, /admin, …) are then rewritten back into
  //     the canonical /org/<slug>/* routes that actually render.
  // The two branches are mutually exclusive (one redirects /org/* away, the
  // other rewrites non-/org/* in), so there is no loop. On the main host /
  // localhost the slug is null and routing stays exactly path-based.
  const tenantSlug = tenantSlugFromHost(host);
  if (
    tenantSlug &&
    (req.nextUrl.pathname === `/org/${tenantSlug}` ||
      req.nextUrl.pathname.startsWith(`/org/${tenantSlug}/`))
  ) {
    const cleaned = req.nextUrl.clone();
    cleaned.pathname = req.nextUrl.pathname.slice(`/org/${tenantSlug}`.length) || "/";
    return NextResponse.redirect(cleaned);
  }
  const internalUrl = req.nextUrl.clone();
  let rewritten = false;
  if (tenantSlug && !internalUrl.pathname.startsWith("/org/")) {
    internalUrl.pathname = `/org/${tenantSlug}${
      internalUrl.pathname === "/" ? "" : internalUrl.pathname
    }`;
    rewritten = true;
  }
  const pathname = internalUrl.pathname;
  const cookieDomain = cookieDomainForHost(host);

  req.headers.set("x-pathname", pathname);
  const passthrough = () =>
    rewritten
      ? NextResponse.rewrite(internalUrl, { request: req })
      : NextResponse.next({ request: req });
  let res = passthrough();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Share the session across the platform host and all org subdomains in
      // production; host-scoped (domain undefined) on localhost.
      cookieOptions: cookieDomain ? { domain: cookieDomain } : undefined,
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = passthrough();
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
    const orgs    = (user?.app_metadata?.orgs ?? {}) as Record<string, OrgRole>;
    const orgRole = slug ? orgs[slug] : undefined;
    const isSuperAdmin =
      !!user && role === "ADMIN" && (adminSubRole ?? "SUPER_ADMIN") === "SUPER_ADMIN";

    // Portal access derives from the role's capabilities, not a fixed role name,
    // so every admin-area role (owner/admin/manager/observer) and author-area
    // role (…/instructor/TA) routes correctly.
    const canAdminArea  = isSuperAdmin || (!!orgRole && ORG_ADMIN_AREA_ROLES.includes(orgRole));
    const canAuthorArea = isSuperAdmin || (!!orgRole && ORG_AUTHOR_ROLES.includes(orgRole));
    const orgHome =
      canAdminArea  ? `/org/${slug}/admin` :
      canAuthorArea ? `/org/${slug}/instructor` :
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
    if (portal === "admin" && !canAdminArea) {
      return NextResponse.redirect(new URL(orgHome, req.url));
    }
    if (portal === "instructor" && !canAuthorArea) {
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
