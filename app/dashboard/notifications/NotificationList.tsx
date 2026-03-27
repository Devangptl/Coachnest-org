"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import {
  Bell,
  BookOpen,
  ShoppingCart,
  Star,
  Clock,
  Tag,
  Settings,
  CheckCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

const typeIcons: Record<string, any> = {
  COURSE_UPDATE: BookOpen,
  PURCHASE: ShoppingCart,
  REVIEW: Star,
  REMINDER: Clock,
  OFFER: Tag,
  SYSTEM: Settings,
};

const typeColors: Record<string, string> = {
  COURSE_UPDATE: "text-blue-400",
  PURCHASE: "text-emerald-400",
  REVIEW: "text-amber-400",
  REMINDER: "text-orange-400",
  OFFER: "text-pink-400",
  SYSTEM: "text-muted-foreground",
};

export default function NotificationList({
  initialNotifications,
  unreadCount,
}: {
  initialNotifications: any[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [markingAll, setMarkingAll] = useState(false);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      const res = await fetch("/api/notifications", { method: "PATCH" });
      if (!res.ok) throw new Error("Failed");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read.");
      router.refresh();
    } catch {
      toast.error("Failed to mark notifications.");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // silent fail
    }
  };

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  return (
    <div className="space-y-6">
      {/* Mark all as read */}
      {unread.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            loading={markingAll}
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 text-sm border border-border"
          >
            <CheckCheck className="w-4 h-4" /> Mark all as read
          </Button>
        </div>
      )}

      {/* Unread Notifications */}
      {unread.length > 0 && (
        <div>
          <h2 className="text-muted-foreground/70 text-xs font-semibold uppercase tracking-widest mb-3">
            Unread ({unread.length})
          </h2>
          <div className="space-y-2">
            {unread.map((n) => (
              <NotificationCard
                key={n.id}
                notification={n}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>
        </div>
      )}

      {/* Read Notifications */}
      {read.length > 0 && (
        <div>
          <h2 className="text-muted-foreground/70 text-xs font-semibold uppercase tracking-widest mb-3">
            Earlier
          </h2>
          <div className="space-y-2">
            {read.map((n) => (
              <NotificationCard
                key={n.id}
                notification={n}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationCard({
  notification,
  onMarkRead,
}: {
  notification: any;
  onMarkRead: (id: string) => void;
}) {
  const Icon = typeIcons[notification.type] || Bell;
  const color = typeColors[notification.type] || "text-muted-foreground";

  const content = (
    <GlassCard
      className={`flex items-start gap-4 cursor-pointer transition-all ${
        !notification.read
          ? "border-l-2 border-l-orange-500 bg-orange-500/15"
          : "opacity-70"
      }`}
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
        <Icon className={`w-5 h-5 ${color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-white font-semibold text-sm">{notification.title}</p>
          {!notification.read && (
            <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
          )}
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
          {notification.body}
        </p>
        <p className="text-white/30 text-xs mt-1.5">
          {formatDate(notification.createdAt)}
        </p>
      </div>
    </GlassCard>
  );

  if (notification.link) {
    return (
      <Link
        href={notification.link}
        onClick={() => !notification.read && onMarkRead(notification.id)}
      >
        {content}
      </Link>
    );
  }

  return (
    <div onClick={() => !notification.read && onMarkRead(notification.id)}>
      {content}
    </div>
  );
}
