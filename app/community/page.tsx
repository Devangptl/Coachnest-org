/**
 * Community Hub — Server component that fetches all data via Prisma
 * and passes to the CommunityHubClient for instant render.
 *
 * Eliminates 3 client-side API calls + 1 subscription status call
 * that previously caused waterfall loading with skeleton states.
 */
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFeatureAccess } from "@/lib/feature-access";
import CommunityHubClient from "./CommunityHubClient";

export default async function CommunityHubPage() {
  const session = await getSession();

  const [threads, groups, events, communityAccess] = await Promise.all([
    prisma.forumThread.findMany({
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        _count: { select: { replies: true } },
      },
      orderBy: { replies: { _count: "desc" as const } },
      take: 5,
    }),
    prisma.studyGroup.findMany({
      where: { isPublic: true },
      include: {
        createdBy: { select: { id: true, name: true, avatar: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.activityFeedEvent.findMany({
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    session
      ? hasFeatureAccess(session.userId, session.role, "community")
      : Promise.resolve(false),
  ]);

  // Serialize dates for client component (Prisma returns Date objects)
  return (
    <CommunityHubClient
      initialThreads={JSON.parse(JSON.stringify(threads))}
      initialGroups={JSON.parse(JSON.stringify(groups))}
      initialEvents={JSON.parse(JSON.stringify(events))}
      hasCommunityAccess={communityAccess}
    />
  );
}
