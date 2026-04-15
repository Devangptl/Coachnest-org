"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Users, BarChart3,
  PlusCircle, Menu, X, TrendingUp, Wallet, TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview",      href: "/instructor",              icon: LayoutDashboard, exact: true },
  { label: "My Courses",    href: "/instructor/courses",      icon: BookOpen },
  { label: "New Course",    href: "/instructor/courses/new",  icon: PlusCircle },
  { label: "My Students",   href: "/instructor/students",     icon: Users },
  { label: "Analytics",     href: "/instructor/analytics",    icon: BarChart3 },
  { label: "Earnings",      href: "/instructor/earnings",     icon: TrendingUp },
  { label: "Refunds",       href: "/instructor/refunds",      icon: TrendingDown },
  { label: "Payouts",       href: "/instructor/payouts",      icon: Wallet },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              isActive
                ? "bg-amber-500/10 text-foreground border border-amber-400/20"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <Icon className={cn("w-4 h-4", isActive ? "text-amber-400" : "text-muted-foreground")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function InstructorSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-20 bg-card border border-border rounded-lg p-3 shadow-glass">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest px-2 mb-2">
            Instructor Panel
          </p>
          <NavLinks />
        </div>
      </aside>

      {/* Mobile FAB */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-6 left-4 z-40 w-12 h-12 rounded-md bg-gradient-to-br from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-600/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="Open instructor menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border shadow-2xl shadow-black/60 p-5 overflow-y-auto animate-slide-in">
            <div className="flex items-center justify-between mb-5">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
                Instructor Panel
              </p>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
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
