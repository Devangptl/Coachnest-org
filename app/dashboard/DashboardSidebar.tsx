"use client";

/**
 * DashboardSidebar — Client Component for student dashboard navigation.
 * Desktop: persistent sidebar column (unchanged).
 * Mobile (<lg): floating toggle + fullscreen slide-out drawer.
 */
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Heart, Award, ShoppingCart, Bell, HelpCircle,
  UserCircle, Trophy, Menu, X, Users2, Package, CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "My Courses",    href: "/dashboard",                    icon: LayoutDashboard },
  { label: "Wishlist",      href: "/dashboard/wishlist",           icon: Heart },
  { label: "Certificates",  href: "/dashboard/certificates",       icon: Award },
  { label: "Achievements",  href: "/dashboard/achievements",       icon: Trophy },
  { label: "Quiz History",  href: "/dashboard/quizzes",            icon: HelpCircle },
  { label: "My Purchases",  href: "/dashboard/subscription",       icon: Package },
  { label: "Billing",       href: "/dashboard/billing",            icon: CreditCard },
  { label: "Order History", href: "/dashboard/orders",             icon: ShoppingCart },
  { label: "Notifications", href: "/dashboard/notifications",      icon: Bell },
  { label: "Community",     href: "/community",                    icon: Users2 },
  { label: "Profile",       href: "/dashboard/profile",            icon: UserCircle },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
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
            onClick={onNavigate}
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
  );
}

export default function DashboardSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      {/* ── Desktop sidebar (unchanged) ─────────────────────────────── */}
      <aside id="tour-sidebar" className="hidden lg:block w-64 flex-shrink-0 self-start sticky top-20 pt-6">
        <div className="bg-card border border-border rounded-lg p-3 shadow-glass max-h-[calc(100vh-6rem)] overflow-y-auto">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest px-2 mb-2">
            Dashboard
          </p>
          <NavLinks />
        </div>
      </aside>

      {/* ── Mobile: floating toggle button ──────────────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-6 left-4 z-40 w-12 h-12 btn-primary p-0 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="Open dashboard menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ── Mobile: slide-out drawer + backdrop ─────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer */}
          <div
            className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border shadow-2xl shadow-black/60 p-5 overflow-y-auto animate-slide-in"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
                Dashboard
              </p>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
