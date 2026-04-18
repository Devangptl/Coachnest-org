"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  Bell, BookOpen, ShoppingCart, Star, Clock, Tag, Settings,
  MessageSquare, Users, ClipboardCheck, Zap, CheckCheck, Check,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
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
  createdAt: string | Date;
}

const TYPE_META: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  COURSE_UPDATE: { icon: BookOpen,       color: "text-blue-500",         bg: "bg-blue-500/10",    label: "Course"      },
  PURCHASE:      { icon: ShoppingCart,   color: "text-emerald-500",      bg: "bg-emerald-500/10", label: "Purchase"    },
  REVIEW:        { icon: Star,           color: "text-amber-500",        bg: "bg-amber-500/10",   label: "Review"      },
  REMINDER:      { icon: Clock,          color: "text-orange-500",       bg: "bg-orange-500/10",  label: "Reminder"    },
  OFFER:         { icon: Tag,            color: "text-pink-500",         bg: "bg-pink-500/10",    label: "Offer"       },
  SYSTEM:        { icon: Settings,       color: "text-muted-foreground", bg: "bg-secondary",      label: "System"      },
  FORUM_REPLY:   { icon: MessageSquare,  color: "text-violet-500",       bg: "bg-violet-500/10",  label: "Forum"       },
  GROUP_INVITE:  { icon: Users,          color: "text-teal-500",         bg: "bg-teal-500/10",    label: "Invite"      },
  PEER_REVIEW:   { icon: ClipboardCheck, color: "text-indigo-500",       bg: "bg-indigo-500/10",  label: "Peer Review" },
  ACTIVITY:      { icon: Zap,            color: "text-yellow-500",       bg: "bg-yellow-500/10",  label: "Activity"    },
};

export default function NotificationList({
  initialNotifications,
  userId,
}: {
  initialNotifications: Notification[];
  unreadCount: number;
  userId: string;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [markingAll, setMarkingAll] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=50");
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    } catch { /* silent */ }
  }, []);

  useRealtimeChannel(channels.userNotifications(userId), {
    [events.notificationCreated]: refresh,
    [events.notificationRead]:    refresh,
  });

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      const res = await fetch("/api/notifications", { method: "PATCH" });
      if (!res.ok) throw new Error();
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
    } catch { /* silent */ }
  };

  const unread = notifications.filter((n) => !n.read);
  const read   = notifications.filter((n) =>  n.read);

  return (
    <div className="space-y-6">
      {unread.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            loading={markingAll}
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 text-sm border border-border"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </Button>
        </div>
      )}

      {unread.length > 0 && (
        <Section label={`Unread · ${unread.length}`}>
          {unread.map((n) => (
            <NotificationCard key={n.id} notification={n} onMarkRead={handleMarkRead} />
          ))}
        </Section>
      )}

      {read.length > 0 && (
        <Section label="Earlier">
          {read.map((n) => (
            <NotificationCard key={n.id} notification={n} onMarkRead={handleMarkRead} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground/60 text-xs font-semibold uppercase tracking-widest mb-3">
        {label}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function NotificationCard({
  notification: n,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const meta = TYPE_META[n.type] ?? TYPE_META.SYSTEM;
  const Icon = meta.icon;

  const inner = (
    <GlassCard
      className={cn(
        "group flex items-start gap-4 transition-all",
        !n.read
          ? "border-l-2 border-l-primary bg-primary/[0.06] hover:bg-primary/10"
          : "border-l-2 border-l-transparent opacity-60 hover:opacity-80"
      )}
    >
      {/* Icon */}
      <div className={cn("w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0", meta.bg)}>
        <Icon className={cn("w-5 h-5", meta.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn("text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded", meta.bg, meta.color)}>
            {meta.label}
          </span>
          {!n.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
        </div>
        <p className="text-foreground font-semibold text-sm mt-1">{n.title}</p>
        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mt-0.5">
          {n.body}
        </p>
        <p className="text-muted-foreground/50 text-xs mt-2">
          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
        </p>
      </div>

      {/* Mark read button */}
      {!n.read && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMarkRead(n.id);
          }}
          title="Mark as read"
          className="opacity-0 group-hover:opacity-100 mt-1 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all flex-shrink-0"
        >
          <Check className="w-4 h-4" />
        </button>
      )}
    </GlassCard>
  );

  if (n.link) {
    return (
      <Link href={n.link} onClick={() => !n.read && onMarkRead(n.id)}>
        {inner}
      </Link>
    );
  }

  return (
    <div onClick={() => !n.read && onMarkRead(n.id)} className="cursor-pointer">
      {inner}
    </div>
  );
}
