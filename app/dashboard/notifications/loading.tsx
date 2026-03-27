/**
 * Notifications loading skeleton — header + notification row list.
 */
import { Skeleton } from "@/components/ui/Skeleton";

function NotificationRowSkeleton({ isUnread }: { isUnread?: boolean }) {
  return (
    <div
      className={`backdrop-blur-lg border border-border rounded-lg p-5 flex items-start gap-4 animate-pulse ${
        isUnread ? "bg-white/[0.12]" : "bg-secondary"
      }`}
    >
      {/* Icon / dot */}
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />

      {/* Content */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton h="h-4" w="w-1/3" />
          {isUnread && <Skeleton className="w-2 h-2 rounded-full" />}
        </div>
        <Skeleton h="h-3" w="w-3/4" />
        <Skeleton h="h-3" w="w-20" />
      </div>

      {/* Action */}
      <Skeleton className="w-4 h-4 rounded flex-shrink-0 mt-1" />
    </div>
  );
}

export default function NotificationsLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8 animate-pulse">
        <Skeleton className="h-9 w-40 rounded-xl mb-2" />
        <Skeleton className="h-4 w-56 rounded-lg" />
      </div>

      {/* Notification rows — mix of unread and read */}
      <div className="space-y-3">
        <NotificationRowSkeleton isUnread />
        <NotificationRowSkeleton isUnread />
        <NotificationRowSkeleton />
        <NotificationRowSkeleton />
        <NotificationRowSkeleton />
      </div>
    </div>
  );
}
