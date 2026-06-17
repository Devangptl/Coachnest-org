/**
 * Subdomain / tenant-host helpers, shared by the Edge middleware and server
 * components. Pure module (no DB, no server-only imports) so it is safe to
 * import from the Edge runtime.
 *
 * Production model:
 *   - <slug>.coachnest.in  → an organization workspace (maps to /org/<slug>/*)
 *   - org.coachnest.in     → the platform/main site (landing, registration,
 *                            platform /login and /admin)
 *   - coachnest.in / www   → redirect to the platform host
 *
 * Development (localhost or any host not under the root domain) has no
 * subdomains, so tenant routing is inert and everything uses the path-based
 * /org/[slug] routes exactly as before.
 *
 * The root domain is read from NEXT_PUBLIC_ROOT_DOMAIN (default "coachnest.in")
 * so the same build can run against staging / preview domains.
 */
export const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "coachnest.in").toLowerCase();

/** Subdomains that serve the platform itself — never treated as org tenants. */
export const RESERVED_SUBDOMAINS = new Set<string>([
  "org",
  "www",
  "app",
  "admin",
  "api",
  "static",
  "assets",
  "cdn",
  "mail",
]);

/** Canonical platform/main host, e.g. "org.coachnest.in". */
export const MAIN_HOST = `org.${ROOT_DOMAIN}`;

function hostnameOf(host: string | null | undefined): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].trim().toLowerCase();
  return hostname || null;
}

/**
 * The org tenant slug encoded in a request host, or null when the host is the
 * apex, a reserved subdomain, or not under the root domain at all (localhost in
 * dev). Multi-label hosts use their leftmost label.
 */
export function tenantSlugFromHost(host: string | null | undefined): string | null {
  const hostname = hostnameOf(host);
  if (!hostname) return null;
  if (hostname === ROOT_DOMAIN) return null; // apex
  if (!hostname.endsWith(`.${ROOT_DOMAIN}`)) return null; // localhost / unrelated host
  const label = hostname.slice(0, -(ROOT_DOMAIN.length + 1)).split(".")[0];
  if (!label || RESERVED_SUBDOMAINS.has(label)) return null;
  return label;
}

/** True for the bare apex (coachnest.in) and www — both belong on the main host. */
export function isApexHost(host: string | null | undefined): boolean {
  const hostname = hostnameOf(host);
  if (!hostname) return false;
  return hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`;
}

/** Absolute URL to a path on the platform/main host. */
export function mainHostUrl(path: string): string {
  return `https://${MAIN_HOST}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Where to send someone who landed on an org host that does not resolve to a
 * registered organization. From a tenant subdomain we cross over to the
 * platform host; on the path-based dev/main host we stay relative.
 */
export function registerUrl(host: string | null | undefined): string {
  return tenantSlugFromHost(host) ? mainHostUrl("/org/register") : "/org/register";
}
