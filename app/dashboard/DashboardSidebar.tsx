"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Heart, Award, ShoppingCart, Bell, HelpCircle, UserCircle, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "My Courses",    href: "/dashboard",                icon: LayoutDashboard },
  { label: "Wishlist",      href: "/dashboard/wishlist",       icon: Heart },
  { label: "Certificates",  href: "/dashboard/certificates",   icon: Award },
  { label: "Quiz History",  href: "/dashboard/quizzes",        icon: HelpCircle },
  { label: "Doubt History", href: "/dashboard/doubts",         icon: MessageCircle },
  { label: "Order History", href: "/dashboard/orders",         icon: ShoppingCart },
  { label: "Notifications", href: "/dashboard/notifications",  icon: Bell },
  { label: "Profile",       href: "/dashboard/profile",        icon: UserCircle },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0">
      <div className="sticky top-24 bg-card border border-border rounded-lg p-4 shadow-glass">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest px-3 mb-3">
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-orange-500/10 text-foreground border border-orange-400/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4",
                    isActive ? "text-orange-400" : "text-muted-foreground"
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
