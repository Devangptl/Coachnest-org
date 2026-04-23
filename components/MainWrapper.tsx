"use client";

import { usePathname } from "next/navigation";

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"];

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth   = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  return (
    <main className={isAuth ? "min-h-screen" : "pt-16 min-h-screen px-4 sm:px-6 lg:px-8 max-w-10xl mx-auto"}>
      {children}
    </main>
  );
}
