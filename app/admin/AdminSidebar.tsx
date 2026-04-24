"use client";

/**
 * AdminSidebar — Client Component that owns its own nav items.
 * Desktop: persistent sidebar column (unchanged).
 * Mobile (<lg): floating toggle + fullscreen slide-out drawer.
 */
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Users, BarChart3, GraduationCap,
  Ticket, ShoppingCart, HelpCircle, Award, FileText, MessageSquare,
  Menu, X, Briefcase, Wallet, RotateCcw, UserCog, UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminNav = [
  { label: "Overview",      href: "/admin",                 icon: LayoutDashboard },
  { label: "Analytics",     href: "/admin/analytics",       icon: BarChart3 },
  { label: "All Courses",   href: "/admin/courses",         icon: BookOpen },
  { label: "Instructors",   href: "/admin/instructors",     icon: UserCog },
  { label: "Students",      href: "/admin/students",        icon: Users },
  { label: "Enrollments",   href: "/admin/enrollments",     icon: GraduationCap },
  { label: "Coupons",       href: "/admin/coupons",         icon: Ticket },
  { label: "Orders",        href: "/admin/orders",          icon: ShoppingCart },
  { label: "Refunds",       href: "/admin/refunds",         icon: RotateCcw },
  { label: "Payouts",       href: "/admin/payouts",         icon: Wallet },
  { label: "Quizzes",       href: "/admin/quizzes",         icon: HelpCircle },
  { label: "Blog Posts",    href: "/admin/blogs",           icon: FileText },
  { label: "Certificates",  href: "/admin/certificates",    icon: Award },
  { label: "Messages",      href: "/admin/messages",        icon: MessageSquare },
  { label: "Professions",   href: "/admin/professions",     icon: Briefcase     },
  { label: "My Profile",   href: "/admin/profile",         icon: UserCircle    },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {adminNav.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
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

export default function AdminSidebar() {
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
      <aside className="hidden lg:block w-64 flex-shrink-0 self-start sticky top-20">
        <div className="bg-card border border-border rounded-lg p-3 shadow-glass">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest px-2 mb-2">
            Admin Panel
          </p>
          <NavLinks />
        </div>
      </aside>

      {/* ── Mobile: floating toggle button ──────────────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-6 left-4 z-40 w-12 h-12 btn-primary p-0 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="Open admin menu"
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
                Admin Panel
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
