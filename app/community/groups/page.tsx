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
      where: {},
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

  // Fetch current user's memberships and join requests for the listed groups
  const groupIds = groups.map((g) => g.id);
  const [myMemberships, myRequests] = session
    ? await Promise.all([
        prisma.studyGroupMember.findMany({
          where: { userId: session.userId, groupId: { in: groupIds } },
          select: { groupId: true, role: true },
        }),
        prisma.groupJoinRequest.findMany({
          where: { userId: session.userId, groupId: { in: groupIds } },
          select: { groupId: true, status: true },
        }),
      ])
    : [[], []];

  // Build lookup maps: groupId -> membership/request status
  const membershipMap: Record<string, string> = {};
  for (const m of myMemberships) membershipMap[m.groupId] = m.role;

  const requestMap: Record<string, string> = {};
  for (const r of myRequests) requestMap[r.groupId] = r.status;

  return (
    <GroupsClient
      initialGroups={JSON.parse(JSON.stringify(groups))}
      hasCommunityAccess={communityAccess}
      myMemberships={membershipMap}
      myRequests={requestMap}
    />
  );
}
