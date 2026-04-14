/**
 * Feature access helpers.
 *
 * Admins and Instructors have unrestricted access to all platform features.
 * Students must purchase a feature add-on before accessing it.
 */
import { prisma } from "@/lib/prisma";

/**
 * Returns true if the user may access the named platform feature.
 *
 * @param userId   - the user's DB id
 * @param role     - "ADMIN" | "INSTRUCTOR" | "STUDENT"
 * @param featureSlug - slug of the PlatformFeature record (e.g. "community")
 */
export async function hasFeatureAccess(
  userId: string,
  role: string,
  featureSlug: string
): Promise<boolean> {
  // Instructors and Admins always have access
  if (role === "ADMIN" || role === "INSTRUCTOR") return true;

  const feature = await prisma.platformFeature.findUnique({
    where: { slug: featureSlug },
    select: { id: true, isActive: true },
  });
  if (!feature || !feature.isActive) return false;

  const purchase = await prisma.featurePurchase.findUnique({
    where: { userId_featureId: { userId, featureId: feature.id } },
    select: { id: true },
  });
  return Boolean(purchase);
}

/**
 * Returns all feature slugs a student has purchased.
 * Always returns all slugs for Admins and Instructors.
 */
export async function getUserFeatureAccess(
  userId: string,
  role: string
): Promise<string[]> {
  if (role === "ADMIN" || role === "INSTRUCTOR") {
    const features = await prisma.platformFeature.findMany({
      where: { isActive: true },
      select: { slug: true },
    });
    return features.map((f) => f.slug);
  }

  const purchases = await prisma.featurePurchase.findMany({
    where: { userId },
    include: { feature: { select: { slug: true } } },
  });
  return purchases.map((p) => p.feature.slug);
}
