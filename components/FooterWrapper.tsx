"use client";

import { usePathname } from "next/navigation";

/**
 * Shows the footer only on public-facing pages.
 * Hidden on: auth, admin, dashboard, instructor, and lesson-content routes.
 * Footer is passed as children from the root Server Component layout so we
 * never import a Server Component inside a Client Component.
 */

const HIDE_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
  "/confirm-email",
  "/admin",
  "/dashboard",
  "/instructor",
  "/whiteboards",
  "/community",
];

export default function FooterWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Hide on app/auth routes
  if (HIDE_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  // Hide inside the immersive lesson viewer (/courses/:id/lessons/*)
  if (/^\/courses\/[^/]+\/lessons/.test(pathname)) return null;

  return <>{children}</>;
}
