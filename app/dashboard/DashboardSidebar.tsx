"use client";

/**
 * DashboardSidebar — Client Component for student dashboard navigation.
 * Desktop: full-height sticky panel with profile header and grouped nav.
 * Mobile (<lg): floating toggle + fullscreen slide-out drawer.
 */
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Heart, Award, ShoppingCart, Bell, HelpCircle,
  UserCircle, Trophy, Menu, X, Users2, Package, CreditCard, BarChart2, GraduationCap,
  ListVideo, Bookmark, Library, PencilRuler,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Avatar from "@/components/Avatar";

interface SidebarUser {
  userId: string;
  name: string;
  email: string;
  avatar?: string | null;
}

const navSections = [
  {
    title: "Learning",
    items: [
      { label: "My Courses",   href: "/dashboard",          icon: LayoutDashboard },
      { label: "My Classes",   href: "/dashboard/classes",  icon: GraduationCap },
      { label: "My Progress",  href: "/dashboard/progress", icon: BarChart2 },
      { label: "Quiz History", href: "/dashboard/quizzes",  icon: HelpCircle },
    ],
  },
  {
    title: "Explore",
    items: [
      { label: "Browse Classes", href: "/classes",   icon: Users2 },
      { label: "Browse Lists",   href: "/playlists", icon: ListVideo },
      { label: "Community",      href: "/community", icon: Users2 },
    ],
  },
  {
    title: "Library",
    items: [
      { label: "My Library",  href: "/dashboard/library",   icon: Library },
      { label: "Saved Lists", href: "/dashboard/playlists", icon: Bookmark },
      { label: "Wishlist",    href: "/dashboard/wishlist",  icon: Heart },
      { label: "Whiteboards", href: "/whiteboards",         icon: PencilRuler },
    ],
  },
  {
    title: "Milestones",
    items: [
      { label: "Certificates", href: "/dashboard/certificates", icon: Award },
      { label: "Achievements", href: "/dashboard/achievements", icon: Trophy },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "My Purchases",  href: "/dashboard/subscription",  icon: Package },
      { label: "Billing",       href: "/dashboard/billing",       icon: CreditCard },
      { label: "Order History", href: "/dashboard/orders",        icon: ShoppingCart },
      { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
      { label: "Profile",       href: "/dashboard/profile",       icon: UserCircle },
    ],
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col">
      {navSections.map((section) => (
        <div key={section.title} className="mb-4 last:mb-0">
          <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {section.title}
          </p>
          <div className="flex flex-col gap-0.5">
            {section.items.map((item) => {
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
                    "group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-orange-500/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-[18px] w-[3px] rounded-full bg-[#d97757]" />
                  )}
                  <Icon
                    className={cn(
                      "w-4 h-4 flex-shrink-0",
                      isActive
                        ? "text-[#d97757]"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function ProfileHeader({ user }: { user: SidebarUser }) {
  return (
    <Link
      href="/dashboard/profile"
      className="flex items-center gap-3 px-4 py-3.5 border-b border-border hover:bg-secondary/60 transition-colors"
    >
      <Avatar
        name={user.name}
        avatar={user.avatar}
        seed={user.userId}
        size="w-9 h-9"
        className="flex-shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </div>
    </Link>
  );
}

export default function DashboardSidebar({ user }: { user: SidebarUser }) {
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
      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <aside
        id="tour-sidebar"
        className="hidden md:block md:w-56 lg:w-64 flex-shrink-0 self-start sticky top-[4.5rem]"
      >
        <div className="flex flex-col h-[calc(100vh-5.5rem)] bg-card border border-border rounded-xl shadow-glass overflow-hidden">
          <ProfileHeader user={user} />
          <div className="flex-1 overflow-y-auto px-2.5 py-3">
            <NavLinks />
          </div>
        </div>
      </aside>

      {/* ── Mobile: floating toggle button ──────────────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="hidden fixed bottom-6 left-4 z-40 w-12 h-12 btn-primary p-0 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="Open dashboard menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ── Mobile: slide-out drawer + backdrop ─────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border shadow-2xl shadow-black/60 flex flex-col animate-slide-in">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
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

            <ProfileHeader user={user} />

            <div className="flex-1 overflow-y-auto px-2.5 py-3">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
