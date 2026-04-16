/**
 * Study Groups — Server component fetches initial data via Prisma.
 * Eliminates client-side fetch waterfall on first load.
 */
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFeatureAccess } from "@/lib/feature-access";
import GroupsClient from "./GroupsClient";

export default async function StudyGroupsPage() {
  const session = await getSession();

  const [groups, communityAccess] = await Promise.all([
    prisma.studyGroup.findMany({
      where: { isPublic: true },
      include: {
        createdBy: { select: { id: true, name: true, avatar: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    session
      ? hasFeatureAccess(session.userId, session.role, "community")
      : Promise.resolve(false),
  ]);

  return (
    <GroupsClient
      initialGroups={JSON.parse(JSON.stringify(groups))}
      hasCommunityAccess={communityAccess}
    />
  );
}
