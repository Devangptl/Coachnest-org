/**
 * Admin → Platform Add-ons page.
 *
 * Lists every PlatformFeature (active + inactive) with purchase counts and
 * lets admins set the price, edit copy, and enable/disable each add-on.
 */
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canAccessAdminPath } from "@/lib/admin-permissions";
import GlassCard from "@/components/GlassCard";
import { Package, CheckCircle2, ShoppingCart, IndianRupee } from "lucide-react";
import AddOnTable from "./AddOnTable";

export default async function AdminAddOnsPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");
  if (!canAccessAdminPath(session.adminSubRole, "/admin/add-ons")) {
    redirect("/admin");
  }

  const [features, revenue] = await Promise.all([
    prisma.platformFeature.findMany({
      include: { _count: { select: { purchases: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.order.aggregate({
      where: { featureId: { not: null }, status: "PAID" },
      _sum:  { amount: true },
    }),
  ]);

  const totalPurchases = features.reduce((sum, f) => sum + f._count.purchases, 0);
  const totalRevenue   = Number(revenue._sum.amount ?? 0);

  const stats = [
    { label: "Total Add-ons",    value: features.length,                                  icon: Package,      color: "text-blue-400" },
    { label: "Active",           value: features.filter((f) => f.isActive).length,        icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Total Purchases",  value: totalPurchases,                                   icon: ShoppingCart, color: "text-primary" },
    { label: "Add-on Revenue",   value: `₹${totalRevenue.toLocaleString("en-IN")}`,       icon: IndianRupee,  color: "text-amber-400" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl sm:text-3xl font-bold text-foreground">Platform Add-ons</h1>
        <p className="text-muted-foreground mt-1">
          One-time purchase features (e.g. Community Access). Set prices, edit copy, and control availability — changes apply to the storefront immediately.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={stat.label} className="flex flex-col items-center text-center gap-2 sm:flex-row sm:text-left sm:gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                <Icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <div className="text-xl md:text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-muted-foreground text-[10px] sm:text-xs md:text-sm leading-tight">{stat.label}</div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <AddOnTable
        features={features.map((f) => ({
          id:          f.id,
          name:        f.name,
          slug:        f.slug,
          description: f.description,
          price:       Number(f.price),
          isActive:    f.isActive,
          purchases:   f._count.purchases,
        }))}
      />
    </div>
  );
}
