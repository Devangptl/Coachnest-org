"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Copy, Eye, Trash2, Pencil } from "lucide-react";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

export default function CouponTable({ coupons }: { coupons: any[] }) {
  const [loading, setLoading] = useState<string | null>(null);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "green";
      case "EXPIRED":
        return "red";
      case "DISABLED":
        return "amber";
      case "UNLIMITED":
        return "blue";
      default:
        return "gray";
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard!");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;

    setLoading(id);
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Coupon deleted successfully!");
      // Refresh page
      window.location.reload();
    } catch (error) {
      toast.error("Error deleting coupon");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="divide-y divide-white/5">
      {coupons.map((coupon) => (
        <div
          key={coupon.id}
          className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-white/5 transition-colors"
        >
          {/* Code */}
          <div className="col-span-2 min-w-0 flex items-center gap-2">
            <code className="text-purple-400 font-mono text-sm">{coupon.code}</code>
            <button
              onClick={() => copyCode(coupon.code)}
              className="text-white/40 hover:text-white transition-colors"
              title="Copy code"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>

          {/* Discount */}
          <div className="col-span-1">
            <span className="text-white font-semibold">
              {coupon.discountType === "PERCENTAGE"
                ? `${coupon.discount}%`
                : `₹${coupon.discount.toLocaleString("en-IN")}`}
            </span>
          </div>

          {/* Uses */}
          <div className="col-span-1 text-sm text-white/70">
            {coupon.maxUses ? `${coupon.uses}/${coupon.maxUses}` : "Unlimited"}
          </div>

          {/* Expires */}
          <div className="col-span-1 text-sm text-white/70">
            {coupon.expiresAt ? formatDate(coupon.expiresAt) : "Never"}
          </div>

          {/* Status */}
          <div className="col-span-1">
            <Badge variant={getStatusVariant(coupon.status)}>
              {coupon.status}
            </Badge>
          </div>

          {/* Discount Given */}
          <div className="col-span-1 text-sm text-white/70">
            ₹{coupon.totalDiscountGiven.toLocaleString("en-IN")}
          </div>

          {/* Actions */}
          <div className="col-span-3 flex items-center justify-end gap-2">
            <Button size="icon" variant="ghost" title="View usage">
              <Eye className="w-4 h-4" />
            </Button>
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
