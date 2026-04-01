"use client";

import { usePathname } from "next/navigation";

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"];

/**
 * Hides its children on auth routes.
 * Navbar is passed as children from the root Server Component layout so we
 * never import a Server Component directly inside a Client Component.
 */
export default function NavbarWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (AUTH_ROUTES.some((r) => pathname.startsWith(r))) return null;
  return <>{children}</>;
}
