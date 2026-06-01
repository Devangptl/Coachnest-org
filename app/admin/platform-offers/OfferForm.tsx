"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { DateTimeInput } from "@/components/ui/DateTimeInput";

export type OfferFormInitial = {
  id?:              string;
  title?:           string;
  description?:     string | null;
  discountType?:    "PERCENTAGE" | "FIXED";
  discountValue?:   number | string;
  maxDiscount?:     number | string | null;
  minCartValue?:    number | string | null;
  scope?:           "ALL" | "COURSES" | "BOOKS";
  startsAt?:        string | null;
  endsAt?:          string | null;
  isActive?:        boolean;
  priority?:        number;
  bannerEnabled?:   boolean;
  bannerCtaText?:   string;
  bannerCtaUrl?:    string;
  bannerBgColor?:   string;
  bannerTextColor?: string;
};

const DEFAULTS: Required<Omit<OfferFormInitial, "id" | "startsAt" | "endsAt">> = {
  title:           "",
  description:     "",
  discountType:    "PERCENTAGE",
  discountValue:   "",
  maxDiscount:     "",
  minCartValue:    "",
  scope:           "ALL",
  isActive:        true,
  priority:        0,
  bannerEnabled:   true,
  bannerCtaText:   "Explore Courses",
  bannerCtaUrl:    "/courses",
  bannerBgColor:   "#d97757",
  bannerTextColor: "#ffffff",
};

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function OfferForm({ initial }: { initial?: OfferFormInitial }) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);

  const [form, setForm] = useState({
    title:           initial?.title           ?? DEFAULTS.title,
    description:     (initial?.description ?? DEFAULTS.description) as string,
    discountType:    initial?.discountType    ?? DEFAULTS.discountType,
    discountValue:   String(initial?.discountValue ?? DEFAULTS.discountValue),
    maxDiscount:     String(initial?.maxDiscount   ?? DEFAULTS.maxDiscount   ?? ""),
    minCartValue:    String(initial?.minCartValue  ?? DEFAULTS.minCartValue  ?? ""),
    scope:           initial?.scope           ?? DEFAULTS.scope,
    startsAt:        toLocalInput(initial?.startsAt),
    endsAt:          toLocalInput(initial?.endsAt),
    isActive:        initial?.isActive        ?? DEFAULTS.isActive,
    priority:        String(initial?.priority ?? DEFAULTS.priority),
    bannerEnabled:   initial?.bannerEnabled   ?? DEFAULTS.bannerEnabled,
    bannerCtaText:   initial?.bannerCtaText   ?? DEFAULTS.bannerCtaText,
    bannerCtaUrl:    initial?.bannerCtaUrl    ?? DEFAULTS.bannerCtaUrl,
    bannerBgColor:   initial?.bannerBgColor   ?? DEFAULTS.bannerBgColor,
    bannerTextColor: initial?.bannerTextColor ?? DEFAULTS.bannerTextColor,
  });

  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    const value = Number(form.discountValue);
    if (!value || value <= 0) { toast.error("Discount value must be > 0"); return; }
    if (form.discountType === "PERCENTAGE" && value > 100) {
      toast.error("Percentage discount cannot exceed 100");
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        title:           form.title.trim(),
        description:     form.description.trim() || undefined,
        discountType:    form.discountType,
        discountValue:   value,
        maxDiscount:     form.maxDiscount  ? Number(form.maxDiscount)  : null,
        minCartValue:    form.minCartValue ? Number(form.minCartValue) : null,
        scope:           form.scope,
        startsAt:        form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt:          form.endsAt   ? new Date(form.endsAt).toISOString()   : null,
        isActive:        form.isActive,
        priority:        Number(form.priority) || 0,
        bannerEnabled:   form.bannerEnabled,
        bannerCtaText:   form.bannerCtaText.trim() || "Explore Courses",
        bannerCtaUrl:    form.bannerCtaUrl.trim()  || "/courses",
        bannerBgColor:   form.bannerBgColor,
        bannerTextColor: form.bannerTextColor,
      };

      const url = isEdit
        ? `/api/admin/platform-offers/${initial!.id}`
        : "/api/admin/platform-offers";
      const res = await fetch(url, {
        method:  isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Save failed"); return; }

      toast.success(isEdit ? "Offer updated" : "Offer created");
      router.push("/admin/platform-offers");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const sampleSubtotal = 999;
  const previewDiscount =
    Number(form.discountValue) > 0
      ? form.discountType === "PERCENTAGE"
        ? Math.min(
            (sampleSubtotal * Number(form.discountValue)) / 100,
            form.maxDiscount ? Number(form.maxDiscount) : Infinity,
          )
        : Math.min(Number(form.discountValue), sampleSubtotal)
      : 0;

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <GlassCard padding="md">
        <h3 className="text-foreground font-semibold mb-4">Offer Details</h3>
        <div className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              type="text"
              className="input-glass w-full"
              placeholder="Flat 20% OFF on All Courses"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Description (optional)</label>
            <textarea
              className="input-glass w-full h-20"
              placeholder="Subtitle shown in the banner and checkout summary."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Discount Type</label>
            <div className="flex gap-3">
              {(["PERCENTAGE", "FIXED"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm({ ...form, discountType: type })}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all border ${
                    form.discountType === type
                      ? "bg-orange-500/20 border-[#d97757]/25 text-foreground"
                      : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {type === "PERCENTAGE" ? "Percentage (%)" : "Fixed Amount (₹)"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">
                Value {form.discountType === "PERCENTAGE" ? "(%)" : "(₹)"}
              </label>
              <input
                type="number"
                className="input-glass w-full"
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                min={0}
                max={form.discountType === "PERCENTAGE" ? 100 : undefined}
              />
            </div>
            {form.discountType === "PERCENTAGE" && (
              <div>
                <label className="label">Max Discount (₹, optional)</label>
                <input
                  type="number"
                  className="input-glass w-full"
                  value={form.maxDiscount}
                  onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                  min={0}
                  placeholder="e.g. 500"
                />
              </div>
            )}
          </div>

          {Number(form.discountValue) > 0 && (
            <div className="p-3 bg-secondary rounded-md border border-border">
              <p className="text-muted-foreground text-xs">Preview on ₹{sampleSubtotal} subtotal:</p>
              <p className="text-emerald-400 font-semibold">
                Save ₹{previewDiscount.toFixed(0)} → Pay ₹{(sampleSubtotal - previewDiscount).toFixed(0)}
              </p>
            </div>
          )}
        </div>
      </GlassCard>

      <GlassCard padding="md">
        <h3 className="text-foreground font-semibold mb-4">Rules</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Applies To</label>
              <select
                className="input-glass w-full"
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value as "ALL" | "COURSES" | "BOOKS" })}
              >
                <option value="ALL">Everything</option>
                <option value="COURSES">Courses only</option>
                <option value="BOOKS">Books only</option>
              </select>
            </div>
            <div>
              <label className="label">Min Cart Value (₹, optional)</label>
              <input
                type="number"
                className="input-glass w-full"
                value={form.minCartValue}
                onChange={(e) => setForm({ ...form, minCartValue: e.target.value })}
                min={0}
                placeholder="e.g. 500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Starts At (optional)</label>
              <DateTimeInput
                type="datetime-local"
                value={form.startsAt}
                onChange={(v) => setForm({ ...form, startsAt: v })}
              />
            </div>
            <div>
              <label className="label">Ends At (optional)</label>
              <DateTimeInput
                type="datetime-local"
                value={form.endsAt}
                onChange={(v) => setForm({ ...form, endsAt: v })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Priority (higher wins)</label>
              <input
                type="number"
                className="input-glass w-full"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Checkbox
                checked={form.isActive}
                onChange={(v) => setForm({ ...form, isActive: v })}
                label="Active"
              />
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard padding="md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground font-semibold">Landing Banner</h3>
          <Checkbox
            checked={form.bannerEnabled}
            onChange={(v) => setForm({ ...form, bannerEnabled: v })}
            label="Show banner"
          />
        </div>

        {form.bannerEnabled && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">CTA Button Text</label>
                <input
                  type="text"
                  className="input-glass w-full"
                  value={form.bannerCtaText}
                  onChange={(e) => setForm({ ...form, bannerCtaText: e.target.value })}
                />
              </div>
              <div>
                <label className="label">CTA Button URL</label>
                <input
                  type="text"
                  className="input-glass w-full"
                  value={form.bannerCtaUrl}
                  onChange={(e) => setForm({ ...form, bannerCtaUrl: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Background Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="h-10 w-14 rounded border border-border bg-transparent"
                    value={form.bannerBgColor}
                    onChange={(e) => setForm({ ...form, bannerBgColor: e.target.value })}
                  />
                  <input
                    type="text"
                    className="input-glass flex-1"
                    value={form.bannerBgColor}
                    onChange={(e) => setForm({ ...form, bannerBgColor: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Text Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="h-10 w-14 rounded border border-border bg-transparent"
                    value={form.bannerTextColor}
                    onChange={(e) => setForm({ ...form, bannerTextColor: e.target.value })}
                  />
                  <input
                    type="text"
                    className="input-glass flex-1"
                    value={form.bannerTextColor}
                    onChange={(e) => setForm({ ...form, bannerTextColor: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground text-xs mb-1.5">Modal preview:</p>
              <div className="rounded-xl overflow-hidden border border-border max-w-sm">
                <div
                  className="px-5 py-6 text-center relative overflow-hidden"
                  style={{ backgroundColor: form.bannerBgColor, color: form.bannerTextColor }}
                >
                  <span
                    className="inline-block text-[10px] font-semibold tracking-widest uppercase mb-2 px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${form.bannerTextColor}26`,
                      border:          `1px solid ${form.bannerTextColor}40`,
                    }}
                  >
                    Limited Offer
                  </span>
                  <div className="flex items-baseline justify-center gap-1.5 leading-none">
                    <span className="text-4xl font-black tracking-tight">
                      {form.discountType === "PERCENTAGE"
                        ? `${form.discountValue || 0}%`
                        : `₹${Number(form.discountValue || 0).toLocaleString("en-IN")}`}
                    </span>
                    <span className="text-base font-bold opacity-90">OFF</span>
                  </div>
                </div>
                <div className="bg-card px-5 py-4 text-center">
                  <p className="text-sm font-semibold text-foreground">{form.title || "Offer title"}</p>
                  {form.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{form.description}</p>
                  )}
                  <div className="mt-3 inline-block px-3 py-1.5 rounded-md text-xs font-bold bg-[#d97757] text-white">
                    {form.bannerCtaText || "Explore Courses"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </GlassCard>

      <div className="flex gap-3">
        <Button type="submit" variant="primary" loading={loading} className="flex-1">
          {isEdit ? "Save Changes" : "Create Offer"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/platform-offers")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
