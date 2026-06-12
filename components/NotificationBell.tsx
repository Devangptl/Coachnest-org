"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell, X, CheckCheck, Mail,
  BookOpen, ShoppingCart, Star, Clock, Tag, Settings,
  MessageSquare, Users, ClipboardCheck, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { channels, events } from "@/lib/realtime/channels";

interface Notification {
  id:        string;
  title:     string;
  body:      string;
  type:      string;
  read:      boolean;
  link:      string | null;
  createdAt: string;
}

const TYPE_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  COURSE_UPDATE: { icon: BookOpen,       color: "text-blue-500",    bg: "bg-blue-500/10"    },
  PURCHASE:      { icon: ShoppingCart,   color: "text-emerald-500", bg: "bg-emerald-500/10" },
  REVIEW:        { icon: Star,           color: "text-amber-500",   bg: "bg-amber-500/10"   },
  REMINDER:      { icon: Clock,          color: "text-orange-500",  bg: "bg-orange-500/10"  },
  OFFER:         { icon: Tag,            color: "text-pink-500",    bg: "bg-pink-500/10"    },
  SYSTEM:        { icon: Settings,       color: "text-muted-foreground", bg: "bg-secondary" },
  FORUM_REPLY:   { icon: MessageSquare,  color: "text-violet-500",  bg: "bg-violet-500/10"  },
  GROUP_INVITE:  { icon: Users,          color: "text-teal-500",    bg: "bg-teal-500/10"    },
  PEER_REVIEW:   { icon: ClipboardCheck, color: "text-indigo-500",  bg: "bg-indigo-500/10"  },
  ACTIVITY:      { icon: Zap,            color: "text-yellow-500",  bg: "bg-yellow-500/10"  },
};

export default function NotificationBell({
  userId,
  role,
}: {
  userId: string;
  role?: "STUDENT" | "INSTRUCTOR" | "ADMIN";
}) {
  const viewAllHref =
    role === "INSTRUCTOR" ? "/instructor/notifications" : "/dashboard/notifications";
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread,        setUnread]        = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res  = await fetch("/api/notifications?limit=10");
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useRealtimeChannel(channels.userNotifications(userId), {
    [events.notificationCreated]: fetchNotifications,
    [events.notificationRead]:    fetchNotifications,
  });

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  async function setReadState(id: string, read: boolean) {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read } : n))
    );
    setUnread((c) => (read ? Math.max(0, c - 1) : c + 1));
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute right-0 top-12 w-80 z-50 bg-card border border-border rounded-md shadow-card overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <h3 className="text-foreground font-semibold text-sm">Notifications</h3>
                {unread > 0 && (
                  <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded-full">
                    {unread}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-primary hover:text-primary/80 text-xs px-2 py-1 rounded-lg hover:bg-primary/10 transition-all"
                  >
                    <CheckCheck className="w-3 h-3" />
                    All read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Bell className="w-8 h-8 opacity-30" />
                  <p className="text-sm">All caught up!</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const meta = TYPE_META[n.type] ?? TYPE_META.SYSTEM;
                  const Icon = meta.icon;
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        "group flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 transition-colors",
                        !n.read ? "bg-primary/[0.06] hover:bg-primary/10" : ""
                      )}
                    >
                      {/* Type icon */}
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", meta.bg)}>
                        <Icon className={cn("w-4 h-4", meta.color)} />
                      </div>

                      {/* Content */}
                      <a
                        href={n.link ?? "#"}
                        onClick={() => {
                          if (!n.read) setReadState(n.id, true);
                          setOpen(false);
                        }}
                        className="flex-1 min-w-0"
                      >
                        <div className="flex items-center gap-1.5">
                          <p className="text-foreground text-xs font-medium leading-snug truncate">{n.title}</p>
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                        </div>
                        <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2 leading-relaxed">{n.body}</p>
                        <p className="text-muted-foreground/50 text-[10px] mt-1">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                      </a>

                      {/* Toggle read / unread */}
                      <button
                        onClick={() => setReadState(n.id, !n.read)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all flex-shrink-0 mt-0.5"
                        title={n.read ? "Mark as unread" : "Mark as read"}
                        aria-label={n.read ? "Mark as unread" : "Mark as read"}
                      >
                        {n.read ? (
                          <Mail className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCheck className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-4 py-2.5">
              <Link
                href={viewAllHref}
                onClick={() => setOpen(false)}
                className="block text-center text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                View all notifications
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
