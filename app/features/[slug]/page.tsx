/**
 * /features/[slug] — Feature add-on detail & purchase page.
 * Server component: renders feature details, the exact checkout price
 * breakdown (incl. processing fee) and access state without a client fetch.
 */
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFeatureMeta } from "@/lib/feature-meta";
import { calcProcessingFee, PROCESSING_FEE_LABEL } from "@/lib/fees";
import GlassCard from "@/components/GlassCard";
import {
  CheckCircle2, ShoppingCart, ArrowLeft, ArrowRight,
  AlertCircle, ShieldCheck, Lock, Zap, BadgeCheck, Sparkles,
} from "lucide-react";

interface PageProps {
  params:       Promise<{ slug: string }>;
  searchParams: Promise<{ success?: string }>;
}

const FAQ = [
  {
    q: "Is this a subscription?",
    a: "No. Add-ons are a one-time purchase with lifetime access — there is nothing to renew or cancel.",
  },
  {
    q: "When do I get access?",
    a: "Immediately. Access is activated automatically the moment your payment is confirmed.",
  },
  {
    q: "Which payment methods are supported?",
    a: "UPI, credit and debit cards — all processed securely by Razorpay without leaving the site.",
  },
];

export default async function FeatureDetailPage({ params, searchParams }: PageProps) {
  const [{ slug }, { success }, session] = await Promise.all([
    params,
    searchParams,
    getSession(),
  ]);

  const feature = await prisma.platformFeature.findUnique({
    where:  { slug },
    select: { id: true, name: true, slug: true, description: true, price: true, isActive: true },
  });

  if (!feature || !feature.isActive) {
    return (
      <div className="pt-4 pb-16 max-w-xl mx-auto text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">Add-on not found</h1>
        <p className="text-muted-foreground text-sm mb-6">
          This add-on doesn&apos;t exist or is no longer available.
        </p>
        <Link href="/features" className="btn-primary inline-flex items-center gap-2 text-sm">
          <ArrowLeft className="w-4 h-4" /> View all add-ons
        </Link>
      </div>
    );
  }

  const privileged = session?.role === "ADMIN" || session?.role === "INSTRUCTOR";
  const purchase   = session
    ? await prisma.featurePurchase.findUnique({
        where:  { userId_featureId: { userId: session.userId, featureId: feature.id } },
        select: { purchasedAt: true },
      })
    : null;
  const hasAccess = privileged || Boolean(purchase);
  const isSuccess = success === "true";

  const price         = Number(feature.price);
  const processingFee = calcProcessingFee(price);
  const payable       = price + processingFee;

  const meta = getFeatureMeta(feature.slug);
  const Icon = meta.icon;

  return (
    <div className="pt-4 pb-16 max-w-xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-6">
        <Link href="/features" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Add-ons
        </Link>
        <span>/</span>
        <span className="text-foreground">{feature.name}</span>
      </div>

      {/* Success state */}
      {isSuccess && (
        <div className="mb-6 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-5 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-emerald-300 font-semibold">Purchase successful!</p>
            <p className="text-emerald-400/70 text-sm mt-0.5">
              Your {feature.name} access is now active. Enjoy!
            </p>
          </div>
        </div>
      )}

      {/* Already owned / included with role */}
      {hasAccess && !isSuccess && (
        <div className="mb-6 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-5 flex items-start gap-3">
          {privileged && !purchase ? (
            <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className="text-emerald-300 font-semibold">You already have access!</p>
            <p className="text-emerald-400/70 text-sm mt-0.5">
              {privileged && !purchase
                ? `${feature.name} is included with your ${session?.role === "ADMIN" ? "admin" : "instructor"} account.`
                : purchase
                ? `You purchased ${feature.name} on ${purchase.purchasedAt.toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                  })} — it's ready to use.`
                : `You purchased ${feature.name} — it's ready to use.`}
            </p>
          </div>
        </div>
      )}

      {/* Feature card */}
      <GlassCard padding="lg" className={`space-y-6 ${hasAccess ? "border-emerald-500/20" : "border-primary/20"}`}>
        {/* Icon + title */}
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-md flex items-center justify-center flex-shrink-0 ${
            hasAccess ? "bg-emerald-500/15" : "bg-primary/10"
          }`}>
            <Icon className={`w-8 h-8 ${hasAccess ? "text-emerald-400" : "text-primary"}`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{feature.name}</h1>
            <p className="text-muted-foreground text-sm">{meta.tagline}</p>
          </div>
        </div>

        {/* Description */}
        {feature.description && (
          <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
        )}

        {/* Includes list */}
        {meta.includes.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              What&apos;s included
            </p>
            <ul className="space-y-2.5">
              {meta.includes.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-foreground/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
              <li className="flex items-center gap-2.5 text-sm text-foreground/80">
                <BadgeCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                Lifetime access — no renewals, ever
              </li>
            </ul>
          </div>
        )}

        {/* Price breakdown + CTA */}
        <div className="pt-4 border-t border-border space-y-4">
          {!hasAccess && (
            <div className="rounded-lg bg-secondary/30 border border-border/60 px-4 py-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{feature.name}</span>
                <span className="font-medium">₹{price.toLocaleString("en-IN")}</span>
              </div>
              {processingFee > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{PROCESSING_FEE_LABEL}</span>
                  <span className="font-medium">₹{processingFee.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border/60 pt-1.5">
                <span className="font-semibold text-foreground">Total at checkout</span>
                <span className="font-bold text-foreground">₹{payable.toLocaleString("en-IN")}</span>
              </div>
            </div>
          )}

          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-3xl font-black text-foreground">
                ₹{price.toLocaleString("en-IN")}
              </p>
              <p className="text-muted-foreground text-xs mt-1">One-time payment · Lifetime access</p>
            </div>

            {hasAccess ? (
              <Link
                href={`/${feature.slug}`}
                className="flex items-center gap-2 px-6 py-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold transition-colors"
              >
                Open {feature.name} <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href={`/checkout/feature/${feature.slug}`}
                className="btn-primary !px-6 !py-3 !text-base !font-semibold"
              >
                <ShoppingCart className="w-4 h-4" /> Buy Now
              </Link>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Trust strip */}
      {!hasAccess && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {[
            { icon: Lock,        text: "256-bit SSL" },
            { icon: ShieldCheck, text: "Secured by Razorpay" },
            { icon: Zap,         text: "Instant activation" },
          ].map(({ icon: TrustIcon, text }) => (
            <div key={text} className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
              <TrustIcon className="w-3.5 h-3.5 flex-shrink-0" />
              {text}
            </div>
          ))}
        </div>
      )}

      {/* FAQ */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-foreground mb-4">Frequently asked questions</h2>
        <div className="space-y-3">
          {FAQ.map(({ q, a }) => (
            <GlassCard key={q} padding="md">
              <p className="text-sm font-semibold text-foreground mb-1">{q}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
