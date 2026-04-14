/**
 * /dashboard/subscription
 * - Students:           Shows purchased courses + feature add-ons (no subscription model)
 * - Instructors/Admins: Full subscription management UI (SubscriptionManagement client component)
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  BookOpen, Users, CheckCircle2, ShoppingBag,
  ArrowRight, ShoppingCart, Package, Clock,
} from "lucide-react";
import GlassCard from "@/components/GlassCard";
import SubscriptionManagement from "@/components/billing/SubscriptionManagement";

// ─── Student data ─────────────────────────────────────────────────────────────

async function getStudentPurchases(userId: string) {
  const [enrollments, featurePurchases] = await Promise.all([
    prisma.enrollment.findMany({
      where:   { userId },
      include: { course: { select: { id: true, title: true, thumbnail: true, isFree: true } } },
      orderBy: { enrolledAt: "desc" },
    }),
    prisma.featurePurchase.findMany({
      where:   { userId },
      include: { feature: { select: { name: true, slug: true, description: true } } },
      orderBy: { purchasedAt: "desc" },
    }),
  ]);

  const hasCommunityAccess = featurePurchases.some((fp) => fp.feature.slug === "community");

  return { enrollments, featurePurchases, hasCommunityAccess };
}

function fmtDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

// ─── Student purchases view ───────────────────────────────────────────────────

async function StudentPurchasesPage({ userId }: { userId: string }) {
  const { enrollments, featurePurchases, hasCommunityAccess } =
    await getStudentPurchases(userId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Purchases</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Everything you&apos;ve bought on the platform — courses and add-ons.
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <GlassCard className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-md bg-orange-500/15 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{enrollments.length}</div>
            <div className="text-muted-foreground text-xs">Courses</div>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-md bg-purple-500/15 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{featurePurchases.length}</div>
            <div className="text-muted-foreground text-xs">Add-ons</div>
          </div>
        </GlassCard>

        <GlassCard className={`flex items-center gap-4 col-span-2 sm:col-span-1 ${hasCommunityAccess ? "border-emerald-500/20" : ""}`}>
          <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${hasCommunityAccess ? "bg-emerald-500/15" : "bg-secondary"}`}>
            <Users className={`w-5 h-5 ${hasCommunityAccess ? "text-emerald-400" : "text-muted-foreground"}`} />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              Community
              {hasCommunityAccess && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            </div>
            <div className="text-muted-foreground text-xs">
              {hasCommunityAccess ? "Access granted" : "Not purchased"}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Feature add-ons */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-400" /> Feature Add-ons
          </h2>
          <Link href="/features" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            Browse all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {featurePurchases.length > 0 ? (
          <div className="space-y-3">
            {featurePurchases.map((fp) => (
              <GlassCard key={fp.id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-foreground font-semibold text-sm">{fp.feature.name}</p>
                    {fp.feature.description && (
                      <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">{fp.feature.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {fmtDate(fp.purchasedAt)}
                  </p>
                  <p className="text-[10px] text-emerald-400 mt-0.5 font-medium">Lifetime access</p>
                </div>
              </GlassCard>
            ))}
          </div>
        ) : (
          <GlassCard className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-foreground font-semibold text-sm">Community Access</p>
                <p className="text-muted-foreground text-xs">Forums · Study Groups · Peer Review — One-time ₹499</p>
              </div>
            </div>
            <Link
              href="/features/community"
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex-shrink-0"
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Buy Access
            </Link>
          </GlassCard>
        )}
      </section>

      {/* Enrolled courses */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-orange-400" /> Enrolled Courses
          </h2>
          <Link href="/courses" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            Browse more <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {enrollments.length > 0 ? (
          <div className="space-y-2">
            {enrollments.map((e) => (
              <Link
                key={e.id}
                href={`/courses/${e.courseId}`}
                className="flex items-center justify-between gap-4 p-4 rounded-md border border-border bg-card hover:border-primary/30 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {e.course.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={e.course.thumbnail}
                      alt=""
                      className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-foreground text-sm font-medium truncate">{e.course.title}</p>
                    <p className="text-muted-foreground text-xs flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> Enrolled {fmtDate(e.enrolledAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {e.course.isFree && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Free
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <GlassCard className="text-center py-10">
            <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm mb-4">You haven&apos;t enrolled in any courses yet.</p>
            <Link href="/courses" className="btn-primary inline-flex items-center gap-2 text-sm">
              Browse Courses <ArrowRight className="w-4 h-4" />
            </Link>
          </GlassCard>
        )}
      </section>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SubscriptionPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "STUDENT") {
    return <StudentPurchasesPage userId={session.userId} />;
  }

  // Instructors and Admins get the full subscription management UI
  return <SubscriptionManagement />;
}
