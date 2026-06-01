/**
 * Admin → Platform Offers list page.
 *
 * Lists every PlatformOffer (active + inactive) plus headline stats:
 * total offers, currently live, lifetime discount given via offers.
 */
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { PlusCircle, Megaphone, TrendingUp, BadgePercent } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { TableSkeleton } from "@/components/ui/Skeleton";
import Pagination from "@/components/ui/Pagination";
import {
  getPlatformOfferStats,
  listPlatformOffers,
} from "@/services/platform-offer.service";
import { canAccessAdminPath } from "@/lib/admin-permissions";
import OfferTable from "./OfferTable";

type SearchParams = { page?: string; pageSize?: string };

async function OfferList({ sp }: { sp: SearchParams }) {
  const { data, total, page, pageSize } = await listPlatformOffers({
    page:     sp.page     ? Number(sp.page)     : undefined,
    pageSize: sp.pageSize ? Number(sp.pageSize) : undefined,
  });

  return (
    <GlassCard padding="sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-foreground font-semibold">All Offers</h2>
        <span className="text-muted-foreground/70 text-sm">{total.toLocaleString()} total</span>
      </div>

      {total === 0 ? (
        <div className="text-center py-12 text-muted-foreground/70">
          <p className="mb-4">No platform offers yet.</p>
          <Link href="/admin/platform-offers/new" className="text-[#d97757] hover:text-orange-300">
            Create your first offer
          </Link>
        </div>
      ) : (
        <>
          <OfferTable offers={data} />
          <Pagination page={page} pageSize={pageSize} total={total} />
        </>
      )}
    </GlassCard>
  );
}

export default async function AdminPlatformOffersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");
  if (!canAccessAdminPath(session.adminSubRole, "/admin/platform-offers")) {
    redirect("/admin");
  }

  const sp = await searchParams;
  const { total, active, totalDiscountGiven } = await getPlatformOfferStats();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Platform Offers</h1>
          <p className="text-muted-foreground mt-1">
            Site-wide automatic discounts and landing-page promotional banners.
          </p>
        </div>
        <Link href="/admin/platform-offers/new" className="btn-primary flex items-center gap-2 text-sm">
          <PlusCircle className="w-4 h-4" /> New Offer
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {[
          { label: "Total Offers",     value: total,                                            icon: Megaphone,     color: "text-blue-400" },
          { label: "Currently Live",   value: active,                                           icon: TrendingUp,    color: "text-emerald-400" },
          { label: "Discount Given",   value: `₹${totalDiscountGiven.toLocaleString("en-IN")}`, icon: BadgePercent,  color: "text-[#d97757]" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={stat.label} className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center">
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-muted-foreground text-sm">{stat.label}</div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <Suspense
        key={`${sp.page ?? "1"}|${sp.pageSize ?? ""}`}
        fallback={<TableSkeleton rows={10} />}
      >
        <OfferList sp={sp} />
      </Suspense>
    </div>
  );
}
