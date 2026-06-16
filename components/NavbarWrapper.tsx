"use client";

import { usePathname } from "next/navigation";

const HIDE_PREFIXES = ["/login", "/org/register"];

// Org workspace login renders its own chrome.
const ORG_LOGIN = /^\/org\/[^/]+\/login/;

/**
 * Hides its children on auth routes and org login.
 * Navbar is passed as children from the root Server Component layout so we
 * never import a Server Component directly inside a Client Component.
 */
export default function NavbarWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (HIDE_PREFIXES.some((r) => pathname.startsWith(r))) return null;
  if (ORG_LOGIN.test(pathname)) return null;
  return <>{children}</>;
}
