/**
 * Site URL helpers for the two-host architecture:
 *   - APP_ORIGIN   — the main platform (courses, dashboard, admin)
 *   - BOOKS_ORIGIN — the books storefront subdomain
 *
 * Both hosts serve from the same Next.js deployment; middleware rewrites the
 * book subdomain's paths onto the canonical /books/* routes. Use these
 * helpers anywhere we emit an externally-facing link (emails, OG metadata,
 * sitemap, social shares, post-purchase deep links) so search engines and
 * users converge on the canonical host for each surface.
 */

export const APP_ORIGIN: string =
  process.env.NEXT_PUBLIC_APP_ORIGIN ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://coachnest.com";

export const BOOKS_ORIGIN: string =
  process.env.NEXT_PUBLIC_BOOKS_ORIGIN ??
  "https://books.coachnest.com";

export const BOOKS_HOST: string =
  process.env.NEXT_PUBLIC_BOOKS_HOST ??
  // Derive from BOOKS_ORIGIN as a fallback
  (() => {
    try { return new URL(BOOKS_ORIGIN).host; }
    catch { return "books.coachnest.com"; }
  })();

export function booksCatalogUrl(): string {
  return `${BOOKS_ORIGIN}/`;
}

export function bookDetailUrl(slug: string): string {
  return `${BOOKS_ORIGIN}/${slug}`;
}
