/**
 * GET /api/community/link-preview?url=<encoded>
 *
 * Fetches a URL and returns OpenGraph / Twitter / fallback metadata so the
 * client can render a rich preview card. Auth-gated to prevent the endpoint
 * from being used as an open URL fetcher. Lightweight SSRF guards reject
 * obvious private/loopback hostnames before any network call.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FETCH_TIMEOUT_MS = 5000;
const MAX_BYTES = 512 * 1024; // 512 KB is plenty for <head>
const UA =
  "Mozilla/5.0 (compatible; LearnHubBot/1.0; +https://learnhub.app/bot)";

const PRIVATE_HOST = [
  "localhost",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
];
const PRIVATE_IP_RE =
  /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2[0-9]|3[01])\.)/;

function isSafeUrl(raw: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase();
  if (PRIVATE_HOST.includes(host)) return null;
  if (PRIVATE_IP_RE.test(host)) return null;
  return parsed;
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .trim();
}

function pickMeta(html: string, names: string[]): string | null {
  for (const name of names) {
    // <meta property="og:title" content="…"> or name=
    const re = new RegExp(
      `<meta[^>]+(?:property|name|itemprop)\\s*=\\s*["']${name.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      )}["'][^>]*>`,
      "i",
    );
    const tag = html.match(re)?.[0];
    if (!tag) continue;
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
    if (content) return decode(content);
  }
  return null;
}

function pickTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decode(m[1].replace(/\s+/g, " ")) : null;
}

function pickFavicon(html: string, base: URL): string {
  const re =
    /<link[^>]+rel=["'][^"']*(?:shortcut icon|icon|apple-touch-icon)[^"']*["'][^>]*>/gi;
  for (const tag of html.match(re) ?? []) {
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (href) {
      try {
        return new URL(href, base).toString();
      } catch {
        /* ignore */
      }
    }
  }
  return new URL("/favicon.ico", base).toString();
}

async function fetchHtml(url: URL): Promise<{ html: string; finalUrl: URL } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en;q=0.9",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok || !res.body) return null;

    const ctype = res.headers.get("content-type") ?? "";
    if (!ctype.toLowerCase().includes("text/html")) return null;

    // Read up to MAX_BYTES so we don't pull down a huge page.
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let received = 0;
    let html = "";
    while (received < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      html += decoder.decode(value, { stream: true });
      // Once we have </head> we have all the metadata we need.
      if (html.includes("</head>")) break;
    }
    try {
      reader.cancel();
    } catch {
      /* ignore */
    }
    const finalUrl = isSafeUrl(res.url) ?? url;
    return { html, finalUrl };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }
  const safe = isSafeUrl(raw);
  if (!safe) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  const result = await fetchHtml(safe);
  if (!result) {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }

  const { html, finalUrl } = result;
  const title =
    pickMeta(html, ["og:title", "twitter:title"]) ?? pickTitle(html);
  const description = pickMeta(html, [
    "og:description",
    "twitter:description",
    "description",
  ]);
  const imageRaw = pickMeta(html, [
    "og:image:secure_url",
    "og:image:url",
    "og:image",
    "twitter:image",
    "twitter:image:src",
  ]);
  let image: string | null = null;
  if (imageRaw) {
    try {
      image = new URL(imageRaw, finalUrl).toString();
    } catch {
      image = null;
    }
  }
  const siteName =
    pickMeta(html, ["og:site_name", "application-name"]) ?? finalUrl.hostname;

  const data: LinkPreviewData = {
    url: finalUrl.toString(),
    title: title ? title.slice(0, 240) : null,
    description: description ? description.slice(0, 360) : null,
    image,
    siteName,
    favicon: pickFavicon(html, finalUrl),
  };

  return NextResponse.json(data, {
    headers: {
      // Cache previews briefly at the CDN edge so re-edits don't re-fetch.
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
