"use client";

/**
 * InstructorSidebar — desktop-only persistent sidebar. On mobile,
 * navigation is provided by the global BottomNav's "More" sheet.
 */
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Users, BarChart3, GraduationCap,
  PlusCircle, TrendingUp, Wallet, TrendingDown, UserCircle, ListVideo, Library, Bell, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { channels, events } from "@/lib/realtime/channels";

const navItems = [
  { label: "Overview",      href: "/instructor",              icon: LayoutDashboard, exact: true },
  { label: "My Courses",    href: "/instructor/courses",      icon: BookOpen },
  { label: "New Course",    href: "/instructor/courses/new",  icon: PlusCircle },
  { label: "My Books",      href: "/instructor/books",        icon: Library },
  { label: "My Classes",    href: "/instructor/classes",      icon: GraduationCap },
  { label: "Course Lists",  href: "/instructor/playlists",    icon: ListVideo },
  { label: "My Students",   href: "/instructor/students",     icon: Users },
  { label: "Analytics",     href: "/instructor/analytics",    icon: BarChart3 },
  { label: "Earnings",      href: "/instructor/earnings",     icon: TrendingUp },
  { label: "Refunds",       href: "/instructor/refunds",      icon: TrendingDown },
  { label: "Payouts",       href: "/instructor/payouts",      icon: Wallet },
  { label: "Invitations",   href: "/instructor/invitations",  icon: Mail },
  { label: "Notifications", href: "/instructor/notifications", icon: Bell },
  { label: "My Profile",    href: "/instructor/profile",      icon: UserCircle },
];

function useUnreadCount(userId?: string) {
  const [unread, setUnread] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=1", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setUnread(data.unread ?? 0);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  useRealtimeChannel(userId ? channels.userNotifications(userId) : null, {
    [events.notificationCreated]: fetchUnread,
    [events.notificationRead]: fetchUnread,
  });

  return unread;
}

export default function InstructorSidebar({ userId }: { userId?: string }) {
  const pathname = usePathname();
  const unread = useUnreadCount(userId);

  return (
    <aside className="hidden md:block md:w-48 lg:w-56 flex-shrink-0 self-start sticky top-16">
      <div className="bg-card border border-border rounded-lg p-3 shadow-glass max-h-[calc(100vh-6rem)] overflow-y-auto">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest px-2 mb-2">
          Instructor Panel
        </p>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            const isNotifications = item.href === "/instructor/notifications";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-amber-500/10 text-foreground border border-amber-400/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-amber-400" : "text-muted-foreground")} />
                <span className="flex-1">{item.label}</span>
                {isNotifications && unread > 0 && (
                  <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 leading-none min-w-[18px] text-center">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

