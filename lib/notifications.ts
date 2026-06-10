import { prisma } from "@/lib/prisma";
import { emit } from "@/lib/realtime/emit";
import { channels, events } from "@/lib/realtime/channels";
import type { Prisma, NotifType } from "@/lib/generated/prisma/client";

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

/**
 * Fan-out a notification to every instructor associated with a course —
 * the owner plus any accepted CO_INSTRUCTOR / EDITOR collaborators. Used
 * for events that should reach the whole teaching team (new enrollment,
 * new review, refund request, etc.).
 *
 * The optional `excludeUserId` skips a single recipient — e.g. when the
 * acting user is themselves an instructor on the course, don't notify them
 * about their own action.
 */
export async function notifyCourseInstructors(opts: {
  courseId: string;
  title: string;
  body: string;
  type?: NotifType;
  link?: string;
  excludeUserId?: string;
}) {
  const course = await prisma.course.findUnique({
    where: { id: opts.courseId },
    select: {
      createdById: true,
      collaborators: {
        where: {
          acceptedAt: { not: null },
          role: { in: ["CO_INSTRUCTOR", "EDITOR"] },
        },
        select: { userId: true },
      },
    },
  });
  if (!course) return;

  const recipientIds = new Set<string>([course.createdById]);
  for (const c of course.collaborators) recipientIds.add(c.userId);
  if (opts.excludeUserId) recipientIds.delete(opts.excludeUserId);

  await Promise.all(
    Array.from(recipientIds).map((userId) =>
      createNotification({
        data: {
          userId,
          title: opts.title,
          body: opts.body,
          type: opts.type ?? "SYSTEM",
          link: opts.link,
        },
      }).catch((err) => console.error("[notify] fan-out failed:", err)),
    ),
  );
}

