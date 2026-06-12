/**
 * /features — Platform feature add-on marketplace.
 * Lists all active features with per-user purchase status.
 * Instructors and Admins get every feature included with their role.
 * Server component: reads session + DB directly.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFeatureMeta } from "@/lib/feature-meta";
import GlassCard from "@/components/GlassCard";
import {
  CheckCircle2, ShoppingCart, ArrowRight, Package,
  ShieldCheck, Zap, BadgeCheck, Sparkles,
} from "lucide-react";

async function getFeatures(userId: string, privileged: boolean) {
  const [features, purchases] = await Promise.all([
    prisma.platformFeature.findMany({
      where:   { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.featurePurchase.findMany({
      where:  { userId },
      select: { featureId: true, purchasedAt: true },
    }),
  ]);
  const purchaseMap = new Map(purchases.map((p) => [p.featureId, p.purchasedAt]));
  return features.map((f) => ({
    ...f,
    purchasedAt: purchaseMap.get(f.id) ?? null,
    owned:       privileged || purchaseMap.has(f.id),
  }));
}

const TRUST_ITEMS = [
  { icon: Zap,         text: "Instant activation after payment" },
  { icon: BadgeCheck,  text: "One-time payment · lifetime access" },
  { icon: ShieldCheck, text: "Secure checkout via Razorpay" },
];

export default async function FeaturesPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/features");

  const privileged = session.role === "ADMIN" || session.role === "INSTRUCTOR";
  const features   = await getFeatures(session.userId, privileged);
  const ownedCount = features.filter((f) => f.owned).length;
  const allOwned   = features.length > 0 && ownedCount === features.length;

  return (
    <div className="pt-4 pb-16 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <span>/</span>
          <span className="text-foreground">Add-ons</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Platform Add-ons</h1>
        <p className="text-muted-foreground">
          Pay once, keep forever — unlock extra platform features with lifetime access.
        </p>
        {privileged ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-emerald-400 font-medium">
            <Sparkles className="w-4 h-4" />
            All add-ons are included with your {session.role === "ADMIN" ? "admin" : "instructor"} account.
          </p>
        ) : ownedCount > 0 && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            {allOwned
              ? "You own every add-on. Nice!"
              : `You own ${ownedCount} of ${features.length} add-ons.`}
          </p>
        )}
      </div>

      {/* Feature list */}
      {features.length === 0 ? (
        <GlassCard className="text-center py-16">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-foreground font-semibold mb-1">No add-ons available yet</h2>
          <p className="text-muted-foreground text-sm">
            New platform features are on the way — check back soon.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {features.map((feature) => {
            const meta = getFeatureMeta(feature.slug);
            const Icon = meta.icon;
            return (
              <GlassCard
                key={feature.id}
                padding="lg"
                className={feature.owned ? "border-emerald-500/20" : ""}
              >
                <div className="flex flex-col sm:flex-row items-start gap-5">
                  <div className={`w-14 h-14 rounded-md flex items-center justify-center flex-shrink-0 ${
                    feature.owned ? "bg-emerald-500/15" : "bg-primary/10"
                  }`}>
                    <Icon className={`w-7 h-7 ${feature.owned ? "text-emerald-400" : "text-primary"}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h2 className="text-foreground font-bold text-lg">{feature.name}</h2>
                      {feature.owned && (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          {feature.purchasedAt ? "Owned" : "Included"}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {feature.description ?? meta.tagline}
                    </p>

                    {meta.includes.length > 0 && (
                      <ul className="mt-3 grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
                        {meta.includes.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-px" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        {feature.owned ? (
                          <p className="text-sm text-muted-foreground">
                            {feature.purchasedAt
                              ? `Purchased on ${feature.purchasedAt.toLocaleDateString("en-IN", {
                                  day: "numeric", month: "short", year: "numeric",
                                })}`
                              : "Included with your account"}
                          </p>
                        ) : (
                          <p className="text-foreground">
                            <span className="text-xl font-bold">
                              ₹{Number(feature.price).toLocaleString("en-IN")}
                            </span>
                            <span className="text-muted-foreground text-xs ml-1.5">
                              one-time · lifetime access
                            </span>
                          </p>
                        )}
                      </div>

                      {feature.owned ? (
                        <Link
                          href={`/${feature.slug}`}
                          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm font-semibold transition-colors"
                        >
                          Open <ArrowRight className="w-4 h-4" />
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/features/${feature.slug}`}
                            className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
                          >
                            View details
                          </Link>
                          <Link
                            href={`/checkout/feature/${feature.slug}`}
                            className="btn-primary !px-5 !py-2.5 !text-sm !font-semibold"
                          >
                            <ShoppingCart className="w-4 h-4" /> Buy Access
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Trust strip */}
      {features.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {TRUST_ITEMS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-xs text-muted-foreground/70">
              <Icon className="w-4 h-4 flex-shrink-0" />
              {text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
