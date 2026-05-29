"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Copy, Eye, Trash2, Pencil, Tag, Calendar, Hash, TrendingDown } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";
import { useConfirm } from "@/components/ui/UIDialogProvider";

export default function CouponTable({ coupons }: { coupons: any[] }) {
  const [loading, setLoading] = useState<string | null>(null);
  const confirm = useConfirm();

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":    return "green"  as const;
      case "EXPIRED":   return "red"    as const;
      case "DISABLED":  return "amber"  as const;
      case "UNLIMITED": return "blue"   as const;
      default:          return "gray"   as const;
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard!");
  };

  const handleDelete = async (id: string) => {
    if (!await confirm("Are you sure you want to delete this coupon?", { title: "Delete Coupon", confirmText: "Delete" })) return;
    setLoading(id);
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Coupon deleted successfully!");
      window.location.reload();
    } catch {
      toast.error("Error deleting coupon");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="divide-y divide-border/50">
      {coupons.map((coupon) => (
        <div
          key={coupon.id}
          className="px-4 py-3.5 hover:bg-secondary/30 transition-colors"
        >
          {/* Row 1: code + copy | discount */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Tag className="w-3.5 h-3.5 text-[#d97757] flex-shrink-0" />
              <code className="text-[#d97757] font-mono text-sm font-semibold">{coupon.code}</code>
              <button
                onClick={() => copyCode(coupon.code)}
                className="text-muted-foreground/60 hover:text-foreground transition-colors flex-shrink-0"
                title="Copy code"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="text-base font-bold text-foreground flex-shrink-0">
              {coupon.discountType === "PERCENTAGE"
                ? `${coupon.discount}%`
                : `₹${coupon.discount.toLocaleString("en-IN")}`}
            </span>
          </div>

          {/* Row 2: status + uses + expires + discount given */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Badge variant={getStatusVariant(coupon.status)}>{coupon.status}</Badge>

            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Hash className="w-3 h-3" />
              {coupon.maxUses ? `${coupon.uses}/${coupon.maxUses} uses` : "Unlimited uses"}
            </span>

            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {coupon.expiresAt ? formatDate(coupon.expiresAt) : "Never expires"}
            </span>

            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingDown className="w-3 h-3 text-emerald-400" />
              ₹{coupon.totalDiscountGiven.toLocaleString("en-IN")} given
            </span>
          </div>

          {/* Row 3: actions */}
          <div className="mt-2 flex items-center gap-1">
            <Link href={`/admin/coupons/${coupon.id}`}>
              <Button size="icon" variant="ghost" title="View usage">
                <Eye className="w-4 h-4" />
              </Button>
            </Link>
            <Link href={`/admin/coupons/${coupon.id}/edit`}>
              <Button size="icon" variant="ghost" title="Edit">
                <Pencil className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              size="icon"
              variant="ghost"
              loading={loading === coupon.id}
              onClick={() => handleDelete(coupon.id)}
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
