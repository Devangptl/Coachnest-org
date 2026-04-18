import { prisma } from "@/lib/prisma";
import { emit } from "@/lib/realtime/emit";
import { channels, events } from "@/lib/realtime/channels";
import type { Prisma } from "@prisma/client";

/**
 * Create a notification and broadcast a realtime event on the recipient's
 * per-user channel so the bell/list updates without polling.
 *
 * Drop-in replacement for `prisma.notification.create`.
 */
export async function createNotification(
  args: Prisma.NotificationCreateArgs,
) {
  const notification = await prisma.notification.create(args);
  await emit(
    channels.userNotifications(notification.userId),
    events.notificationCreated,
    notification,
  );
  return notification;
}
