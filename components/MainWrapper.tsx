"use client";

import { usePathname } from "next/navigation";

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"];

const BOTTOM_NAV_PREFIXES = ["/dashboard", "/instructor", "/admin", "/community"];

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isFullScreen = pathname.startsWith("/whiteboards");
  const hasBottomNav = BOTTOM_NAV_PREFIXES.some((p) => pathname.startsWith(p));

  // Auth + whiteboard routes render edge-to-edge with no navbar offset/padding.
  if (isAuth || isFullScreen) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <main
      className="pt-14 min-h-screen px-3 sm:px-5 lg:px-7 mx-auto"
      style={hasBottomNav ? { paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom))" } : undefined}
    >
      {children}
    </main>
  );
}
