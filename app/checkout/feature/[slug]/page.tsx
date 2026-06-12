/**
 * /checkout/feature/[slug]
 * In-app feature checkout using Razorpay Custom Checkout.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFeatureMeta } from "@/lib/feature-meta";
import FeatureCheckoutClient from "./FeatureCheckoutClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function FeatureCheckoutPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await getSession();
  if (!session) redirect(`/login?next=/checkout/feature/${slug}`);

  const feature = await prisma.platformFeature.findUnique({
    where:  { slug },
    select: { id: true, name: true, slug: true, description: true, price: true, isActive: true },
  });

  if (!feature || !feature.isActive) redirect("/features");

  // Instructors and Admins get all features included with their role
  if (session.role === "ADMIN" || session.role === "INSTRUCTOR") {
    redirect(`/features/${slug}`);
  }

  // Already owns it?
  const existing = await prisma.featurePurchase.findUnique({
    where: { userId_featureId: { userId: session.userId, featureId: feature.id } },
  });
  if (existing) redirect(`/features/${slug}`);

  return (
    <div className="pt-4 pb-16 max-w-5xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Checkout</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Review your order and complete payment to unlock this feature.
      </p>
      <FeatureCheckoutClient
          featureId={feature.id}
          featureName={feature.name}
          featureSlug={feature.slug}
          description={feature.description}
          price={Number(feature.price)}
          includes={getFeatureMeta(feature.slug).includes}
          userEmail={session.email}
        />
    </div>
  );
}
