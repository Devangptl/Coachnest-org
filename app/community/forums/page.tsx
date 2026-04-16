/**
 * Forums list — Server component fetches initial data via Prisma.
 * Eliminates client-side fetch waterfall on first load.
 */
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFeatureAccess } from "@/lib/feature-access";
import ForumsClient from "./ForumsClient";

export default async function ForumsPage() {
  const session = await getSession();

  const limit = 20;

  const [threads, total, communityAccess] = await Promise.all([
    prisma.forumThread.findMany({
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.forumThread.count(),
    session
      ? hasFeatureAccess(session.userId, session.role, "community")
      : Promise.resolve(false),
  ]);

  return (
    <ForumsClient
      initialThreads={JSON.parse(JSON.stringify(threads))}
      initialTotal={total}
      initialTotalPages={Math.ceil(total / limit)}
      hasCommunityAccess={communityAccess}
    />
  );
}
