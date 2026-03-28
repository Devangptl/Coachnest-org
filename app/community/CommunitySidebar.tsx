"use client";

/**
 * CommunitySidebar — sub-navigation for the community hub.
 * Desktop: persistent sidebar. Mobile: floating toggle + drawer.
 */
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare, Users, ClipboardCheck, Activity, Menu, X, Compass
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Hub",          href: "/community",              icon: Compass },
  { label: "Forums",       href: "/community/forums",       icon: MessageSquare },
  { label: "Study Groups", href: "/community/groups",       icon: Users },
  { label: "Peer Review",  href: "/community/peer-review",  icon: ClipboardCheck },
  { label: "Activity Feed",href: "/community/feed",         icon: Activity },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive =
          item.href === "/community"
            ? pathname === "/community"
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
                ? "bg-emerald-500/10 text-foreground border border-emerald-400/20"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <Icon
              className={cn(
                "w-4 h-4",
                isActive ? "text-emerald-400" : "text-muted-foreground"
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function CommunitySidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <aside id="tour-community-sidebar" className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-24 bg-card border border-border rounded-lg p-4 shadow-glass">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest px-3 mb-3">
            Community
          </p>
          <NavLinks />
        </div>
      </aside>

      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-6 left-4 z-40 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
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
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border shadow-2xl shadow-black/60 p-5 overflow-y-auto animate-slide-in">
            <div className="flex items-center justify-between mb-5">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
                Community
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
