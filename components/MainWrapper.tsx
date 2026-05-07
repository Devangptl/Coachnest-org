"use client";

import { usePathname } from "next/navigation";

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"];

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth   = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  return (
    <main className={isAuth ? "min-h-screen" : "pt-14 min-h-screen px-3 sm:px-5 lg:px-7 mx-auto"}>
      {children}
    </main>
  );
}
