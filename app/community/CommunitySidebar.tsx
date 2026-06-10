"use client";

/**
 * CommunitySidebar — sub-navigation for the community hub.
 * Desktop: persistent sidebar. Mobile: floating toggle + drawer.
 * Shows lock badges on write-gated sections for users without Community access.
 */
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare, Users, ClipboardCheck, Activity, Menu, X, Compass, Lock,
  ShoppingCart, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePurchasedFeatures } from "@/hooks/usePurchasedFeatures";

const navItems = [
  { label: "Hub",           href: "/community",             icon: Compass,        requiresAccess: false },
  { label: "Forums",        href: "/community/forums",      icon: MessageSquare,  requiresAccess: true  },
  { label: "Study Groups",  href: "/community/groups",      icon: Users,          requiresAccess: true  },
  { label: "Peer Review",   href: "/community/peer-review", icon: ClipboardCheck, requiresAccess: true  },
  { label: "Activity Feed", href: "/community/feed",        icon: Activity,       requiresAccess: false },
];

function NavLinks({ onNavigate, hasAccess }: { onNavigate?: () => void; hasAccess: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col">
      <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        Spaces
      </p>
      <div className="flex flex-col gap-0.5">
        {navItems.map((item) => {
          const isActive =
            item.href === "/community"
              ? pathname === "/community"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          const locked = item.requiresAccess && !hasAccess;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald-500/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-[18px] w-[3px] rounded-full bg-emerald-400" />
              )}
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0",
                  isActive
                    ? "text-emerald-400"
                    : locked
                      ? "text-muted-foreground/50"
                      : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>

              {locked && (
                <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary/70 border border-primary/20 flex-shrink-0">
                  <Lock className="w-2.5 h-2.5" />
                  Add-on
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Buy Community Access nudge for users without access */}
      {!hasAccess && (
        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <p className="text-xs font-semibold text-foreground">Unlock Community</p>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-2.5">
            Join forums, study groups and peer reviews with other learners.
          </p>
          <Link
            href="/features/community"
            onClick={onNavigate}
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Buy Community Access
          </Link>
        </div>
      )}
    </nav>
  );
}

export default function CommunitySidebar() {
  const pathname = usePathname();
  const { hasCommunityAccess, isLoading } = usePurchasedFeatures();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Default to true while loading to avoid flicker
  const hasAccess = isLoading ? true : hasCommunityAccess;

  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <aside className="hidden lg:block w-64 flex-shrink-0 self-start sticky top-[4.5rem]">
        <div
          id="tour-community-sidebar"
          className="max-h-[calc(100vh-5.5rem)] flex flex-col bg-card border border-border rounded-xl shadow-glass overflow-hidden"
        >
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border flex-shrink-0">
            <span className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-emerald-400" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Community</p>
              <p className="text-[11px] text-muted-foreground truncate">Learn together</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2.5 py-3">
            <NavLinks hasAccess={hasAccess} />
          </div>
        </div>
      </aside>

      <button
        onClick={() => setMobileOpen(true)}
        className="hidden fixed bottom-6 left-4 z-40 w-12 h-12 rounded-md bg-gradient-to-br from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="Open community menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-xs bg-card border-r border-border shadow-2xl shadow-black/60 flex flex-col animate-slide-in">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-emerald-400" />
                </span>
                <p className="text-sm font-semibold text-foreground">Community</p>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-2.5 py-3">
              <NavLinks onNavigate={() => setMobileOpen(false)} hasAccess={hasAccess} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
