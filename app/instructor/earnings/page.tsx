"use client";

/**
 * /instructor/earnings — full earnings dashboard for instructors.
 * Shows wallet summary, revenue by source, by course, monthly chart, recent orders.
 */
import { useEffect, useState } from "react";
import {
  Wallet, TrendingUp, ArrowDownToLine, DollarSign,
  Loader2, Globe, Link2, Tag, BarChart3, ShoppingBag,
  RefreshCw, Clock, CheckCircle2, AlertCircle,
} from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EarningsData {
  wallet:    { balance: number; totalEarned: number; totalWithdrawn: number };
  summary:   { totalEarnings: number; platformCut: number; totalRevenue: number; totalOrders: number };
  perCourse: { courseId: string; title: string; revenuePercent: number; earnings: number; platformCut: number; orders: number }[];
  bySource:  { ORGANIC: number; REFERRAL: number; COUPON: number; ADS: number };
  monthly:   { month: string; revenue: number }[];
  recentOrders: {
    id: string; amount: number; instructorRevenue: number; platformRevenue: number;
    saleSource: string; instructorPercent: number; courseTitle: string; createdAt: string;
  }[];
}

// ── Source styles ─────────────────────────────────────────────────────────────

const SOURCE_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; pct: number }> = {
  ORGANIC:  { label: "Organic",  icon: Globe,    color: "text-blue-400",   bg: "bg-blue-500/10",   pct: 70 },
  REFERRAL: { label: "Referral", icon: Link2,    color: "text-emerald-400",bg: "bg-emerald-500/10",pct: 90 },
  COUPON:   { label: "Coupon",   icon: Tag,      color: "text-violet-400", bg: "bg-violet-500/10", pct: 85 },
  ADS:      { label: "Ads",      icon: BarChart3, color: "text-amber-400", bg: "bg-amber-500/10",  pct: 70 },
};

// ── Mini bar chart ────────────────────────────────────────────────────────────

function MonthlyChart({ data }: { data: { month: string; revenue: number }[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="flex items-end gap-2 h-28 w-full">
      {data.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5">
          <div className="w-full flex items-end justify-center" style={{ height: "80px" }}>
            <div
              className="w-full rounded-t-md bg-orange-500/70 hover:bg-orange-500 transition-colors"
              style={{ height: `${Math.max((d.revenue / max) * 80, d.revenue > 0 ? 4 : 0)}px` }}
              title={`₹${d.revenue.toLocaleString()}`}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function InstructorEarningsPage() {
  const [data,    setData]    = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/instructor/earnings");
      if (!res.ok) throw new Error("Failed to load earnings.");
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <GlassCard className="text-center py-12">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">{error || "No data."}</p>
        <button onClick={load} className="btn-primary mt-4 inline-flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </GlassCard>
    );
  }

  const { wallet, summary, perCourse, bySource, monthly, recentOrders } = data;
  const totalSource = Object.values(bySource).reduce((s, v) => s + v, 0) || 1;

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Earnings</h1>
        <p className="text-muted-foreground/70 text-sm mt-1">
          Track your revenue, wallet balance, and payout history.
        </p>
      </div>

      {/* ── Wallet cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Available Balance", value: wallet.balance,        icon: Wallet,        color: "text-orange-400",  bg: "bg-orange-500/10"  },
          { label: "Total Earned",      value: wallet.totalEarned,    icon: TrendingUp,    color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Total Withdrawn",   value: wallet.totalWithdrawn, icon: ArrowDownToLine,color:"text-blue-400",    bg: "bg-blue-500/10"    },
          { label: "Total Sales",       value: summary.totalOrders,   icon: ShoppingBag,   color: "text-violet-400",  bg: "bg-violet-500/10", isCount: true },
        ].map(({ label, value, icon: Icon, color, bg, isCount }) => (
          <GlassCard key={label} className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", bg)}>
              <Icon className={cn("w-5 h-5", color)} />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-bold text-foreground">
                {isCount ? value : `₹${Number(value).toLocaleString()}`}
              </div>
              <div className="text-xs text-muted-foreground truncate">{label}</div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* ── Split info banner ─────────────────────────────────────────────── */}
      <GlassCard className="flex flex-wrap gap-3">
        <span className="text-sm font-medium text-foreground mr-2">Revenue split:</span>
        {Object.entries(SOURCE_META).map(([src, meta]) => {
          const Icon = meta.icon;
          return (
            <span key={src} className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
              meta.bg, meta.color, "border-current/20"
            )}>
              <Icon className="w-3 h-3" />
              {meta.label}: <strong>{meta.pct}%</strong> you
            </span>
          );
        })}
      </GlassCard>

      {/* ── Monthly chart + Source breakdown ──────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <GlassCard>
          <h2 className="text-base font-semibold text-foreground mb-4">Monthly Earnings</h2>
          <MonthlyChart data={monthly} />
        </GlassCard>

        <GlassCard>
          <h2 className="text-base font-semibold text-foreground mb-4">Revenue by Source</h2>
          <div className="space-y-3">
            {Object.entries(bySource).map(([src, rev]) => {
              const meta = SOURCE_META[src];
              const Icon = meta.icon;
              const pct  = Math.round((rev / totalSource) * 100);
              return (
                <div key={src}>
                  <div className="flex items-center justify-between mb-1">
                    <div className={cn("flex items-center gap-1.5 text-sm", meta.color)}>
                      <Icon className="w-3.5 h-3.5" />
                      <span className="font-medium">{meta.label}</span>
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      ₹{rev.toLocaleString()}
                      <span className="text-xs text-muted-foreground ml-1">({pct}%)</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", meta.bg.replace("/10", ""))}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* ── Revenue by course ─────────────────────────────────────────────── */}
      {perCourse.length > 0 && (
        <GlassCard>
          <h2 className="text-base font-semibold text-foreground mb-4">Revenue by Course</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left">
                  <th className="pb-2 font-medium pr-4">Course</th>
                  <th className="pb-2 font-medium text-right">Sales</th>
                  <th className="pb-2 font-medium text-right">Your Cut</th>
                  <th className="pb-2 font-medium text-right">Platform</th>
                  <th className="pb-2 font-medium text-right">Your %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {perCourse.map((c) => (
                  <tr key={c.courseId} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-2.5 pr-4 font-medium text-foreground max-w-[200px] truncate">{c.title}</td>
                    <td className="py-2.5 text-right text-muted-foreground">{c.orders}</td>
                    <td className="py-2.5 text-right text-emerald-400 font-semibold">₹{c.earnings.toLocaleString()}</td>
                    <td className="py-2.5 text-right text-muted-foreground">₹{c.platformCut.toLocaleString()}</td>
                    <td className="py-2.5 text-right">
                      <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full">
                        {c.revenuePercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* ── Recent orders ─────────────────────────────────────────────────── */}
      {recentOrders.length > 0 && (
        <GlassCard>
          <h2 className="text-base font-semibold text-foreground mb-4">Recent Sales</h2>
          <div className="space-y-2">
            {recentOrders.map((o) => {
              const meta = SOURCE_META[o.saleSource] ?? SOURCE_META["ORGANIC"];
              const Icon = meta.icon;
              return (
                <div key={o.id}
                  className="flex items-center justify-between gap-4 py-2.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", meta.bg)}>
                      <Icon className={cn("w-3.5 h-3.5", meta.color)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{o.courseTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString()} · {meta.label} · {o.instructorPercent}% split
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-emerald-400">+₹{o.instructorRevenue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">of ₹{o.amount.toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {recentOrders.length === 0 && perCourse.length === 0 && (
        <GlassCard className="text-center py-16">
          <DollarSign className="w-12 h-12 text-muted-foreground/25 mx-auto mb-4" />
          <p className="text-foreground font-semibold mb-1">No earnings yet</p>
          <p className="text-muted-foreground text-sm">Your revenue will appear here once students purchase your courses.</p>
        </GlassCard>
      )}
    </div>
  );
}
