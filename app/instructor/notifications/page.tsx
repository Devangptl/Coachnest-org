/**
 * Instructor → Notifications.
 * Server component fetches the instructor's notifications and reuses
 * the dashboard NotificationList for consistent UI + realtime updates.
 */
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import GlassCard from "@/components/GlassCard";
import NotificationList from "@/app/dashboard/notifications/NotificationList";

export const dynamic = "force-dynamic";

async function getInstructorNotifications(userId: string) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return {
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type,
      read: n.read,
      link: n.link,
      createdAt: n.createdAt,
    })),
    unreadCount: notifications.filter((n) => !n.read).length,
  };
}

export default async function InstructorNotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { notifications, unreadCount } = await getInstructorNotifications(session.userId);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`
              : "You're all caught up."}
          </p>
        </div>
      </div>

      {notifications.length > 0 ? (
        <NotificationList
          initialNotifications={notifications}
          unreadCount={unreadCount}
          userId={session.userId}
        />
      ) : (
        <GlassCard padding="lg">
          <div className="text-center py-12 text-muted-foreground/70">
            <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p>No notifications yet.</p>
            <p className="text-xs mt-2">
              You&apos;ll be notified about new enrollments, reviews, refund requests, and payout updates.
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
