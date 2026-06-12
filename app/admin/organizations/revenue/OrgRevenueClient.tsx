"use client";

/**
 * Platform admin → Organization revenue dashboard.
 * Stat cards + monthly revenue chart + revenue-by-org and plan breakdown.
 */
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Building2, IndianRupee, RotateCcw, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

interface RevenueData {
  stats: {
    totalOrganizations: number;
    activeOrganizations: number;
    expiredOrganizations: number;
    activeSubscriptions: number;
    grossRevenue: number;
    refunds: number;
    netRevenue: number;
  };
  byOrg: { organizationId: string; name: string; slug: string; gross: number; refunds: number; net: number }[];
  monthly: { month: string; revenue: number; refunds: number; net: number }[];
  breakdown: { planName: string; billingCycle: string; count: number; revenue: number }[];
  usage: { organizationId: string; name: string; courses: number; members: number; enrollments: number }[];
}

export default function OrgRevenueClient() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/organizations/revenue")
      .then(async (res) => {
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        setData(d);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load revenue"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data) return <p className="text-sm text-muted-foreground">No data available.</p>;

  const cards = [
    {
      label: "Net subscription revenue",
      value: `₹${data.stats.netRevenue.toLocaleString("en-IN")}`,
      icon: IndianRupee,
    },
    {
      label: "Refunds",
      value: `₹${data.stats.refunds.toLocaleString("en-IN")}`,
      icon: RotateCcw,
    },
    {
      label: "Active organizations",
      value: `${data.stats.activeOrganizations} / ${data.stats.totalOrganizations}`,
      icon: Building2,
    },
    {
      label: "Active subscriptions",
      value: String(data.stats.activeSubscriptions),
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-2">
                <Icon className="w-3.5 h-3.5" /> {c.label}
              </div>
              <p className="text-xl font-bold text-foreground">{c.value}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Monthly revenue (last 6 months)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthly} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "rgba(20,20,20,0.95)",
                  border: "1px solid rgba(120,120,120,0.25)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="refunds" name="Refunds" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Revenue by organization</h2>
          </div>
          <div className="divide-y divide-border">
            {data.byOrg.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground text-center">No revenue yet.</p>
            ) : (
              data.byOrg.map((o) => (
                <div key={o.organizationId} className="px-5 py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{o.name}</p>
                    <p className="text-xs text-muted-foreground">/org/{o.slug}</p>
                  </div>
                  {o.refunds > 0 && (
                    <p className="text-xs text-red-400 whitespace-nowrap">
                      -₹{o.refunds.toLocaleString("en-IN")}
                    </p>
                  )}
                  <p className="text-sm font-semibold text-foreground whitespace-nowrap">
                    ₹{o.net.toLocaleString("en-IN")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Active subscriptions by plan</h2>
          </div>
          <div className="divide-y divide-border">
            {data.breakdown.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground text-center">No active subscriptions.</p>
            ) : (
              data.breakdown.map((b, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {b.planName} · {b.billingCycle === "YEARLY" ? "Yearly" : "Monthly"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{b.count} orgs</p>
                  <p className="text-sm font-semibold text-foreground whitespace-nowrap">
                    ₹{b.revenue.toLocaleString("en-IN")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Course usage by organization</h2>
        </div>
        <div className="divide-y divide-border">
          {data.usage.map((u) => (
            <div key={u.organizationId} className="px-5 py-3 flex items-center gap-4">
              <p className="text-sm font-medium text-foreground min-w-0 flex-1 truncate">{u.name}</p>
              <p className="text-xs text-muted-foreground whitespace-nowrap">{u.members} members</p>
              <p className="text-xs text-muted-foreground whitespace-nowrap">{u.courses} courses</p>
              <p className="text-xs text-muted-foreground whitespace-nowrap">{u.enrollments} enrollments</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
