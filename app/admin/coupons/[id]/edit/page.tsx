"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface CouponData {
  id: string;
  code: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED";
  discount: number;
  maxUses: number | null;
  expiresAt: string | null;
}

export default function EditCouponPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [coupon, setCoupon] = useState<CouponData | null>(null);
  const [form, setForm] = useState({
    description: "",
    discount: "",
    maxUses: "",
    expiresAt: "",
  });

  useEffect(() => {
    fetch(`/api/admin/coupons/${id}`)
      .then((r) => r.json())
      .then(({ data }) => {
        if (!data) { router.push("/admin/coupons"); return; }
        setCoupon(data);
        setForm({
          description: data.description ?? "",
          discount: String(data.discount),
          maxUses: data.maxUses != null ? String(data.maxUses) : "",
          expiresAt: data.expiresAt
            ? new Date(data.expiresAt).toISOString().split("T")[0]
            : "",
        });
      })
      .catch(() => toast.error("Failed to load coupon."))
      .finally(() => setFetching(false));
  }, [id, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.discount) { toast.error("Discount is required."); return; }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.description || undefined,
          discount: Number(form.discount),
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          expiresAt: form.expiresAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to update coupon."); return; }
      toast.success("Coupon updated successfully!");
      router.push("/admin/coupons");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!coupon) return null;

  const samplePrice = 999;
  const previewDiscount = form.discount
    ? coupon.discountType === "PERCENTAGE"
      ? samplePrice * (Number(form.discount) / 100)
      : Number(form.discount)
    : 0;

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/admin/coupons"
          className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Coupons
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Edit Coupon</h1>
        <p className="text-muted-foreground mt-1">
          Update coupon settings for{" "}
          <code className="text-orange-400 font-mono">{coupon.code}</code>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Code (read-only) */}
        <GlassCard padding="md">
          <h3 className="text-foreground font-semibold mb-4">Coupon Code</h3>
          <div className="flex items-center gap-3 p-3 bg-secondary rounded-md border border-border">
            <code className="text-orange-400 font-mono text-lg font-bold">{coupon.code}</code>
            <span className="text-muted-foreground text-xs">
              · {coupon.discountType === "PERCENTAGE" ? "Percentage discount" : "Fixed amount discount"} · cannot be changed
            </span>
          </div>
        </GlassCard>

        {/* Discount */}
        <GlassCard padding="md">
          <h3 className="text-foreground font-semibold mb-4">Discount Details</h3>
          <div className="space-y-4">
            <div>
              <label className="label">
                Discount {coupon.discountType === "PERCENTAGE" ? "(%)" : "(₹)"}
              </label>
              <input
                type="number"
                className="input-glass w-full"
                placeholder={coupon.discountType === "PERCENTAGE" ? "e.g. 20" : "e.g. 200"}
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
                min={0}
                max={coupon.discountType === "PERCENTAGE" ? 100 : undefined}
              />
            </div>

            {form.discount && (
              <div className="p-3 bg-secondary rounded-md border border-border">
                <p className="text-muted-foreground text-xs">Preview on ₹{samplePrice} course:</p>
                <p className="text-emerald-400 font-semibold">
                  Save ₹{previewDiscount.toFixed(0)} → Pay ₹{(samplePrice - previewDiscount).toFixed(0)}
                </p>
              </div>
            )}

            <div>
              <label className="label">Description (optional)</label>
              <textarea
                className="input-glass w-full h-20"
                placeholder="Internal note about this coupon..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
        </GlassCard>

        {/* Limits */}
        <GlassCard padding="md">
          <h3 className="text-foreground font-semibold mb-4">Limits</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Max Uses (empty = unlimited)</label>
              <input
                type="number"
                className="input-glass w-full"
                placeholder="e.g. 100"
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                min={0}
              />
            </div>
            <div>
              <label className="label">Expires At (empty = never)</label>
              <input
                type="date"
                className="input-glass w-full"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              />
            </div>
          </div>
        </GlassCard>

        <div className="flex gap-3">
          <Button type="submit" variant="primary" loading={loading} className="flex-1">
            Save Changes
          </Button>
          <Link href="/admin/coupons">
            <Button type="button" variant="ghost">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
