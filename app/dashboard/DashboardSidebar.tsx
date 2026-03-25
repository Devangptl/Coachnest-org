"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Heart, Award, ShoppingCart, Bell, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "My Courses",    href: "/dashboard",                icon: LayoutDashboard },
  { label: "Wishlist",      href: "/dashboard/wishlist",       icon: Heart },
  { label: "Certificates",  href: "/dashboard/certificates",   icon: Award },
  { label: "Order History", href: "/dashboard/orders",         icon: ShoppingCart },
  { label: "Notifications", href: "/dashboard/notifications",  icon: Bell },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0">
      <div className="sticky top-24 backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl p-4 shadow-xl">
        <p className="text-white/40 text-xs font-semibold uppercase tracking-widest px-3 mb-3">
          Dashboard
        </p>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-violet-500/30 to-purple-600/20 text-white border border-purple-400/30"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4",
                    isActive ? "text-purple-400" : "text-white/50"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
