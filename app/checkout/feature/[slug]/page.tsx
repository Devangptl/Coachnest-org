/**
 * /checkout/feature/[slug]
 * Redirects to Stripe Checkout (hosted page) supporting UPI + cards.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import FeatureCheckoutClient from "./FeatureCheckoutClient";

// What's included copy — mirrors FeaturePurchaseGate / features page
const FEATURE_INCLUDES: Record<string, string[]> = {
  community: [
    "Post & reply in discussion forums",
    "Create and join study groups",
    "Submit work for peer review",
    "Full activity feed participation",
    "Lifetime access · no renewal",
  ],
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function FeatureCheckoutPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login?next=/features");

  const { slug } = await params;

  const feature = await prisma.platformFeature.findUnique({
    where:  { slug },
    select: { id: true, name: true, slug: true, description: true, price: true, isActive: true },
  });

  if (!feature || !feature.isActive) redirect("/features");

  // Already owns it?
  const existing = await prisma.featurePurchase.findUnique({
    where: { userId_featureId: { userId: session.userId, featureId: feature.id } },
  });
  if (existing) redirect(`/features/${slug}?success=true`);

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-16">
        <FeatureCheckoutClient
          featureId={feature.id}
          featureName={feature.name}
          featureSlug={feature.slug}
          description={feature.description}
          price={Number(feature.price)}
          includes={FEATURE_INCLUDES[feature.slug] ?? []}
        />
      </main>
    </div>
  );
}
