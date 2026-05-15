/**
 * Async server component that resolves the user's onboarding-tour state
 * and renders the lazy tour. Wrapped in Suspense in the layout so it
 * doesn't block child page rendering.
 */
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OnboardingTour from "@/components/OnboardingTour";

export default async function OnboardingTourGate() {
  const session = await getSession();
  if (!session) return null;

  const user: any = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { hasSeenTour: true } as any,
  });

  const hasSeenTour = user?.hasSeenTour ?? false;
  if (hasSeenTour) return null;

  return <OnboardingTour initialRun />;
}
