"use client";

import { usePathname } from "next/navigation";

const AUTH_ROUTES = ["/login"];

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  // Auth routes render edge-to-edge with no navbar offset/padding.
  if (isAuth) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <main className="pt-14 min-h-screen px-3 sm:px-5 lg:px-7 mx-auto overflow-x-hidden">
      {children}
    </main>
  );
}
