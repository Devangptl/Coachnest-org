/**
 * /features — Platform feature add-on marketplace.
 * Lists all active features with purchase status for logged-in students.
 * Server component: reads session + DB directly.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import GlassCard from "@/components/GlassCard";
import {
  Users, CheckCircle2, ShoppingCart, ArrowRight, Package,
} from "lucide-react";

async function getFeatures(userId: string) {
  const [features, purchases] = await Promise.all([
    prisma.platformFeature.findMany({
      where:   { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.featurePurchase.findMany({
      where:  { userId },
      select: { featureId: true },
    }),
  ]);
  const ownedIds = new Set(purchases.map((p) => p.featureId));
  return features.map((f) => ({ ...f, owned: ownedIds.has(f.id) }));
}

const FEATURE_ICONS: Record<string, React.ElementType> = {
  community: Users,
};

export default async function FeaturesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const features = await getFeatures(session.userId);
  const ownedCount = features.filter((f) => f.owned).length;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <span>/</span>
          <span className="text-foreground">Add-ons</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Platform Add-ons</h1>
        <p className="text-muted-foreground">
          One-time purchases — unlock extra platform features with lifetime access.
          {ownedCount > 0 && (
            <span className="ml-2 text-emerald-400 font-medium">
              You own {ownedCount} of {features.length}.
            </span>
          )}
        </p>
      </div>

      {/* Feature list */}
      {features.length === 0 ? (
        <GlassCard className="text-center py-16">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No add-ons available right now. Check back soon!</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {features.map((feature) => {
            const Icon = FEATURE_ICONS[feature.slug] ?? Package;
            return (
              <GlassCard
                key={feature.id}
                className={`flex flex-col sm:flex-row items-start sm:items-center gap-5 ${
                  feature.owned ? "border-emerald-500/20" : ""
                }`}
              >
                <div className={`w-14 h-14 rounded-md flex items-center justify-center flex-shrink-0 ${
                  feature.owned ? "bg-emerald-500/15" : "bg-orange-500/10"
                }`}>
                  <Icon className={`w-7 h-7 ${feature.owned ? "text-emerald-400" : "text-orange-400"}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-foreground font-bold">{feature.name}</h2>
                    {feature.owned && (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Owned
                      </span>
                    )}
                  </div>
                  {feature.description && (
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                  )}
                  <p className="text-foreground font-semibold mt-2">
                    ₹{Number(feature.price).toLocaleString("en-IN")}
                    <span className="text-muted-foreground font-normal text-xs ml-1">one-time</span>
                  </p>
                </div>

                <div className="flex-shrink-0 w-full sm:w-auto">
                  {feature.owned ? (
                    <Link
                      href={`/${feature.slug}`}
                      className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm font-semibold transition-colors"
                    >
                      Open <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <Link
                      href={`/features/${feature.slug}`}
                      className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4" /> Buy Access
                    </Link>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
