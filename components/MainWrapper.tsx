"use client";

import { usePathname } from "next/navigation";

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"];

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth   = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  return (
    <main className={isAuth ? "min-h-screen" : "pt-24 min-h-screen"}>
      {children}
    </main>
  );
}
