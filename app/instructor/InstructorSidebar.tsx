"use client";

/**
 * InstructorSidebar — desktop-only full-height sticky panel with profile
 * header and grouped nav. On mobile, navigation is provided by the global
 * BottomNav's "More" sheet.
 */
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Users, BarChart3, GraduationCap,
  PlusCircle, TrendingUp, Wallet, TrendingDown, UserCircle, ListVideo, Library, Bell, Mail, PencilRuler,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Avatar from "@/components/Avatar";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { channels, events } from "@/lib/realtime/channels";

interface SidebarUser {
  userId: string;
  name: string;
  email: string;
  avatar?: string | null;
}

const navSections = [
  {
    title: "Overview",
    items: [
      { label: "Overview",  href: "/instructor",           icon: LayoutDashboard, exact: true },
      { label: "Analytics", href: "/instructor/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Teaching",
    items: [
      { label: "My Courses",   href: "/instructor/courses",     icon: BookOpen },
      { label: "New Course",   href: "/instructor/courses/new", icon: PlusCircle },
      { label: "My Books",     href: "/instructor/books",       icon: Library },
      { label: "My Classes",   href: "/instructor/classes",     icon: GraduationCap },
      { label: "Course Lists", href: "/instructor/playlists",   icon: ListVideo },
      { label: "Whiteboards",  href: "/whiteboards",            icon: PencilRuler },
      { label: "My Students",  href: "/instructor/students",    icon: Users },
    ],
  },
  {
    title: "Earnings",
    items: [
      { label: "Earnings", href: "/instructor/earnings", icon: TrendingUp },
      { label: "Refunds",  href: "/instructor/refunds",  icon: TrendingDown },
      { label: "Payouts",  href: "/instructor/payouts",  icon: Wallet },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Invitations",   href: "/instructor/invitations",   icon: Mail },
      { label: "Notifications", href: "/instructor/notifications", icon: Bell },
      { label: "My Profile",    href: "/instructor/profile",       icon: UserCircle },
    ],
  },
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

export default function InstructorSidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const unread = useUnreadCount(user.userId);

  return (
    <aside className="hidden md:block md:w-56 lg:w-64 flex-shrink-0 self-start sticky top-[4.5rem]">
      <div className="flex flex-col h-[calc(100vh-5.5rem)] bg-card border border-border rounded-xl shadow-glass overflow-hidden">
        <Link
          href="/instructor/profile"
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
            <p className="text-[11px] text-amber-400 font-medium uppercase tracking-wider truncate">
              Instructor
            </p>
          </div>
        </Link>

        <div className="flex-1 overflow-y-auto px-2.5 py-3">
          <nav className="flex flex-col">
            {navSections.map((section) => (
              <div key={section.title} className="mb-4 last:mb-0">
                <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {section.title}
                </p>
                <div className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
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
                          "group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "bg-amber-500/10 text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        )}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-[18px] w-[3px] rounded-full bg-amber-400" />
                        )}
                        <Icon
                          className={cn(
                            "w-4 h-4 flex-shrink-0",
                            isActive ? "text-amber-400" : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                        {isNotifications && unread > 0 && (
                          <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 leading-none min-w-[18px] text-center">
                            {unread > 9 ? "9+" : unread}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
}
