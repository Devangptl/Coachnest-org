"use client";

/**
 * Platform admin → Organizations list with search/status filter and
 * quick links to the org detail, revenue, and plans pages.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Loader2, Search, BarChart3, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  status: string;
  createdAt: string;
  members: number;
  courses: number;
  plan: string | null;
  billingCycle: string | null;
  endDate: string | null;
  netRevenue: number;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-500/10 text-green-500",
  PENDING: "bg-amber-500/10 text-amber-500",
  EXPIRED: "bg-red-500/10 text-red-400",
  SUSPENDED: "bg-red-500/10 text-red-400",
};

const STATUSES = ["", "ACTIVE", "PENDING", "EXPIRED", "SUSPENDED"];

export default function OrganizationsClient() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/organizations?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrgs(data.organizations ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organizations…"
            className="input-glass pl-9 w-full"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-glass w-40">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "" ? "All statuses" : s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <div className="flex gap-2 sm:ml-auto">
          <Link href="/admin/organizations/revenue" className="btn-secondary">
            <BarChart3 className="w-4 h-4" /> Revenue
          </Link>
          <Link href="/admin/organizations/plans" className="btn-secondary">
            <Layers className="w-4 h-4" /> Plans
          </Link>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : orgs.length === 0 ? (
          <p className="px-5 py-10 text-sm text-muted-foreground text-center">No organizations found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="px-5 py-3 font-medium">Organization</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Plan</th>
                  <th className="px-3 py-3 font-medium text-right">Members</th>
                  <th className="px-3 py-3 font-medium text-right">Courses</th>
                  <th className="px-3 py-3 font-medium text-right">Net Revenue</th>
                  <th className="px-3 py-3 font-medium">Renewal</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orgs.map((o) => (
                  <tr key={o.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">{o.name}</p>
                      <p className="text-xs text-muted-foreground">/org/{o.slug}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap",
                          STATUS_STYLES[o.status] ?? "bg-secondary text-muted-foreground",
                        )}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                      {o.plan ?? "—"}
                      {o.billingCycle ? ` · ${o.billingCycle === "YEARLY" ? "Yr" : "Mo"}` : ""}
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground">{o.members}</td>
                    <td className="px-3 py-3 text-right text-muted-foreground">{o.courses}</td>
                    <td className="px-3 py-3 text-right font-medium text-foreground whitespace-nowrap">
                      ₹{o.netRevenue.toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                      {o.endDate
                        ? new Date(o.endDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/organizations/${o.id}`}
                        className="text-xs text-orange-500 hover:text-[#d97757] font-medium whitespace-nowrap"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
