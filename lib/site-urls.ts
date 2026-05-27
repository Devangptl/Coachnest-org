/**
 * Site URL helpers — used to emit externally-facing links (emails, OG
 * metadata, sitemap, social shares, post-purchase deep links).
 *
 * The books module lives at `/books` on the main domain — there is no
 * separate subdomain. These helpers exist as a single seam in case that
 * changes in the future.
 */

export const APP_ORIGIN: string =
  process.env.NEXT_PUBLIC_APP_ORIGIN ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://coachnest.com";

export function booksCatalogUrl(): string {
  return `${APP_ORIGIN}/books`;
}

export function bookDetailUrl(slug: string): string {
  return `${APP_ORIGIN}/books/${slug}`;
}
