/**
 * Peer Review — Server component fetches initial data via Prisma.
 * Eliminates client-side fetch waterfall on first load.
 */
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFeatureAccess } from "@/lib/feature-access";
import PeerReviewClient from "./PeerReviewClient";

export default async function PeerReviewPage() {
  const session = await getSession();

  const [assignments, communityAccess] = await Promise.all([
    session
      ? prisma.peerReviewAssignment.findMany({
          where: { submittedById: session.userId },
          include: {
            _count: { select: { reviews: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
    session
      ? hasFeatureAccess(session.userId, session.role, "community")
      : Promise.resolve(false),
  ]);

  return (
    <PeerReviewClient
      initialAssignments={JSON.parse(JSON.stringify(assignments))}
      hasCommunityAccess={communityAccess}
    />
  );
}
