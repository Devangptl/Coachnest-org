"use client";

/**
 * Platform admin → Subscription plan CRUD. Plans are soft-archived,
 * never deleted (existing subscriptions reference them).
 */
import { useCallback, useEffect, useState, FormEvent } from "react";
import toast from "react-hot-toast";
import { Loader2, Plus, Pencil, Archive, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  maxStudents: number | null;
  maxInstructors: number | null;
  maxCourses: number | null;
  features: string[] | null;
  isActive: boolean;
  sortOrder: number;
}

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  priceMonthly: "",
  priceYearly: "",
  maxStudents: "",
  maxInstructors: "",
  maxCourses: "",
  features: "",
  sortOrder: "0",
};

export default function PlansClient() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Plan | "new" | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/organizations/plans");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlans(data.plans ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openEditor(plan: Plan | "new") {
    setEditing(plan);
    if (plan === "new") {
      setForm(emptyForm);
    } else {
      setForm({
        name: plan.name,
        slug: plan.slug,
        description: plan.description ?? "",
        priceMonthly: String(plan.priceMonthly),
        priceYearly: String(plan.priceYearly),
        maxStudents: plan.maxStudents != null ? String(plan.maxStudents) : "",
        maxInstructors: plan.maxInstructors != null ? String(plan.maxInstructors) : "",
        maxCourses: plan.maxCourses != null ? String(plan.maxCourses) : "",
        features: (plan.features ?? []).join("\n"),
        sortOrder: String(plan.sortOrder),
      });
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        priceMonthly: parseFloat(form.priceMonthly),
        priceYearly: parseFloat(form.priceYearly),
        maxStudents: form.maxStudents ? parseInt(form.maxStudents) : null,
        maxInstructors: form.maxInstructors ? parseInt(form.maxInstructors) : null,
        maxCourses: form.maxCourses ? parseInt(form.maxCourses) : null,
        features: form.features
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean),
        sortOrder: parseInt(form.sortOrder) || 0,
      };
      const isNew = editing === "new";
      const res = await fetch(
        isNew
          ? "/api/admin/organizations/plans"
          : `/api/admin/organizations/plans/${(editing as Plan).id}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(isNew ? "Plan created" : "Plan updated");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save plan");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(plan: Plan) {
    if (!confirm(`Archive the ${plan.name} plan? It will no longer be offered to new organizations.`))
      return;
    try {
      const res = await fetch(`/api/admin/organizations/plans/${plan.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Plan archived");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive plan");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-5">
        <button onClick={() => openEditor("new")} className="btn-primary">
          <Plus className="w-4 h-4" /> New Plan
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((p) => (
          <div
            key={p.id}
            className={cn(
              "bg-card border border-border rounded-xl p-5 flex flex-col",
              !p.isActive && "opacity-60",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">
                  {p.name}
                  {!p.isActive && (
                    <span className="text-[10px] text-muted-foreground ml-2">(archived)</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{p.slug}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => openEditor(p)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  aria-label="Edit plan"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {p.isActive && (
                  <button
                    onClick={() => handleArchive(p)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    aria-label="Archive plan"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-xl font-bold text-foreground mt-3">
              ₹{p.priceMonthly.toLocaleString("en-IN")}
              <span className="text-xs font-normal text-muted-foreground">/mo</span>
              <span className="text-sm font-medium text-muted-foreground ml-2">
                ₹{p.priceYearly.toLocaleString("en-IN")}/yr
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {p.maxStudents ?? "∞"} students · {p.maxInstructors ?? "∞"} instructors ·{" "}
              {p.maxCourses ?? "∞"} courses
            </p>
            {p.description && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{p.description}</p>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 overflow-y-auto py-8">
          <form
            onSubmit={handleSave}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg animate-fade-in my-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {editing === "new" ? "New plan" : `Edit ${(editing as Plan).name}`}
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Name *</label>
                <input
                  className="input-glass" required minLength={2}
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Slug *</label>
                <input
                  className="input-glass" required pattern="[a-z0-9-]+"
                  value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Monthly price (₹) *</label>
                <input
                  type="number" min={0} step="0.01" className="input-glass" required
                  value={form.priceMonthly}
                  onChange={(e) => setForm({ ...form, priceMonthly: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Yearly price (₹) *</label>
                <input
                  type="number" min={0} step="0.01" className="input-glass" required
                  value={form.priceYearly}
                  onChange={(e) => setForm({ ...form, priceYearly: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Max students</label>
                <input
                  type="number" min={1} className="input-glass" placeholder="Unlimited"
                  value={form.maxStudents}
                  onChange={(e) => setForm({ ...form, maxStudents: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Max instructors</label>
                <input
                  type="number" min={1} className="input-glass" placeholder="Unlimited"
                  value={form.maxInstructors}
                  onChange={(e) => setForm({ ...form, maxInstructors: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Max courses</label>
                <input
                  type="number" min={1} className="input-glass" placeholder="Unlimited"
                  value={form.maxCourses}
                  onChange={(e) => setForm({ ...form, maxCourses: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Sort order</label>
                <input
                  type="number" className="input-glass"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="label">Description</label>
                <input
                  className="input-glass"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="label">Features (one per line)</label>
                <textarea
                  className="input-glass min-h-[90px]"
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full mt-5" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editing === "new" ? "Create Plan" : "Save Changes"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
