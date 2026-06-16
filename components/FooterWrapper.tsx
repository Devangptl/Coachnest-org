"use client";

import { usePathname } from "next/navigation";

/**
 * Shows the footer only on public-facing pages.
 * Hidden on: auth, admin, and org workspace portals (which render their own chrome).
 * Footer is passed as children from the root Server Component layout so we
 * never import a Server Component inside a Client Component.
 */

const HIDE_PREFIXES = ["/login", "/admin"];

// Org workspace portals (/org/:slug/*) render their own chrome.
const ORG_PORTAL = /^\/org\/[^/]+\//;

export default function FooterWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (HIDE_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  if (ORG_PORTAL.test(pathname)) return null;

  return <>{children}</>;
}
