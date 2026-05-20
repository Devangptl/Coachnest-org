/**
 * Async server component that resolves the user's tour state, then renders
 * the lazy-loaded tour. Wrapped in Suspense in the layout so it doesn't
 * block child page rendering.
 */
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CommunityTourLazy from "./CommunityTourLazy";

export default async function CommunityTourGate() {
  const session = await getSession();
  if (!session) return null;

  const user: any = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { hasSeenCommunityTour: true } as any,
  });

  const hasSeenCommunityTour = user?.hasSeenCommunityTour ?? false;
  if (hasSeenCommunityTour) return null;

  return <CommunityTourLazy initialRun />;
}
