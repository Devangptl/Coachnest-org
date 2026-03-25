"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function NewCouponPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [form, setForm] = useState({
    code: "",
    description: "",
    discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
    discount: "",
    maxUses: "",
    expiresAt: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!autoGenerate && !form.code) {
      toast.error("Please enter a coupon code or enable auto-generate.");
      return;
    }
    if (!form.discount) {
      toast.error("Discount amount is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: autoGenerate ? undefined : form.code.toUpperCase(),
          autoGenerate,
          description: form.description || undefined,
          discountType: form.discountType,
          discount: Number(form.discount),
          maxUses: form.maxUses ? Number(form.maxUses) : undefined,
          expiresAt: form.expiresAt || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create coupon.");
        return;
      }

      toast.success("Coupon created successfully!");
      router.push("/admin/coupons");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const samplePrice = 999;
  const previewDiscount =
    form.discount
      ? form.discountType === "PERCENTAGE"
        ? samplePrice * (Number(form.discount) / 100)
        : Number(form.discount)
      : 0;

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/admin/coupons"
          className="text-white/50 hover:text-white text-sm flex items-center gap-1 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Coupons
        </Link>
        <h1 className="text-3xl font-bold text-white">Create Coupon</h1>
        <p className="text-white/50 mt-1">Set up a new promotional code for your courses.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Code */}
        <GlassCard padding="md">
          <h3 className="text-white font-semibold mb-4">Coupon Code</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoGenerate}
                onChange={(e) => setAutoGenerate(e.target.checked)}
                className="accent-purple-500"
              />
              <span className="text-white/70 text-sm flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Auto-generate code
              </span>
            </label>
            {!autoGenerate && (
              <div>
                <label className="label">Code</label>
                <input
                  type="text"
                  className="input-glass w-full uppercase"
                  placeholder="e.g. SUMMER2026"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
            )}
          </div>
        </GlassCard>

        {/* Discount */}
        <GlassCard padding="md">
          <h3 className="text-white font-semibold mb-4">Discount Details</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Discount Type</label>
              <div className="flex gap-3">
                {(["PERCENTAGE", "FIXED"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm({ ...form, discountType: type })}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                      form.discountType === type
                        ? "bg-purple-500/30 border-purple-400/40 text-white"
                        : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {type === "PERCENTAGE" ? "Percentage (%)" : "Fixed Amount (₹)"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">
                Discount {form.discountType === "PERCENTAGE" ? "(%)" : "(₹)"}
              </label>
              <input
                type="number"
                className="input-glass w-full"
                placeholder={form.discountType === "PERCENTAGE" ? "e.g. 20" : "e.g. 200"}
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
                min={0}
                max={form.discountType === "PERCENTAGE" ? 100 : undefined}
              />
            </div>

            {form.discount && (
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/50 text-xs">Preview on ₹{samplePrice} course:</p>
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
          <h3 className="text-white font-semibold mb-4">Limits</h3>
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

        {/* Submit */}
        <div className="flex gap-3">
          <Button type="submit" variant="primary" loading={loading} className="flex-1">
            Create Coupon
          </Button>
          <Link href="/admin/coupons">
            <Button type="button" variant="ghost">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
