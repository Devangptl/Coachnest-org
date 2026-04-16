/**
 * Activity Feed — Server component fetches initial data via Prisma.
 * Eliminates client-side fetch on first load.
 */
import { prisma } from "@/lib/prisma";
import FeedClient from "./FeedClient";

export default async function ActivityFeedPage() {
  const limit = 30;

  const [events, total] = await Promise.all([
    prisma.activityFeedEvent.findMany({
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.activityFeedEvent.count(),
  ]);

  return (
    <FeedClient
      initialEvents={JSON.parse(JSON.stringify(events))}
      initialTotalPages={Math.ceil(total / limit)}
    />
  );
}
