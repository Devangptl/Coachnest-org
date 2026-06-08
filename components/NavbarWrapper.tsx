"use client";

import { usePathname } from "next/navigation";

const HIDE_PREFIXES = ["/login", "/signup", "/forgot-password", "/reset-password", "/onboarding", "/confirm-email", "/whiteboards"];

/**
 * Hides its children on auth routes and the full-screen whiteboard.
 * Navbar is passed as children from the root Server Component layout so we
 * never import a Server Component directly inside a Client Component.
 */
export default function NavbarWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (HIDE_PREFIXES.some((r) => pathname.startsWith(r))) return null;
  return <>{children}</>;
}
