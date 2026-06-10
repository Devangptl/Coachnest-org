"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Pencil, Trash2, Package, PlusCircle, Users, X } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/UIDialogProvider";

export interface AdminAddOn {
  id:          string;
  name:        string;
  slug:        string;
  description: string | null;
  price:       number;
  isActive:    boolean;
  purchases:   number;
}

interface EditState {
  name:        string;
  description: string;
  price:       string;
}

export default function AddOnTable({ features }: { features: AdminAddOn[] }) {
  const router  = useRouter();
  const confirm = useConfirm();

  const [busyId,    setBusyId]    = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit,      setEdit]      = useState<EditState>({ name: "", description: "", price: "" });
  const [creating,  setCreating]  = useState(false);
  const [draft,     setDraft]     = useState<EditState>({ name: "", description: "", price: "" });

  function startEdit(f: AdminAddOn) {
    setEditingId(f.id);
    setEdit({ name: f.name, description: f.description ?? "", price: String(f.price) });
  }

  function validate(state: EditState): { name: string; description: string | null; price: number } | null {
    const price = Number(state.price);
    if (!state.name.trim()) {
      toast.error("Name is required.");
      return null;
    }
    if (state.price === "" || !Number.isFinite(price) || price < 0) {
      toast.error("Enter a valid non-negative price.");
      return null;
    }
    return { name: state.name.trim(), description: state.description.trim() || null, price };
  }

  async function saveEdit(f: AdminAddOn) {
    const data = validate(edit);
    if (!data) return;

    setBusyId(f.id);
    try {
      const res = await fetch(`/api/admin/features/${f.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to update add-on");
      toast.success(
        data.price !== f.price
          ? `Price updated to ₹${data.price.toLocaleString("en-IN")}`
          : "Add-on updated"
      );
      setEditingId(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(f: AdminAddOn) {
    setBusyId(f.id);
    try {
      const res = await fetch(`/api/admin/features/${f.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ isActive: !f.isActive }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to update add-on");
      toast.success(f.isActive ? "Add-on disabled — hidden from the storefront" : "Add-on enabled");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(f: AdminAddOn) {
    const ok = await confirm(`Delete the "${f.name}" add-on? This cannot be undone.`, {
      title:       "Delete Add-on",
      confirmText: "Delete",
    });
    if (!ok) return;

    setBusyId(f.id);
    try {
      const res = await fetch(`/api/admin/features/${f.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to delete");
      toast.success(json?.deactivated ? "Add-on has orders — deactivated instead" : "Add-on deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate() {
    const data = validate(draft);
    if (!data) return;

    setBusyId("new");
    try {
      const res = await fetch("/api/admin/features", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to create add-on");
      toast.success(`"${data.name}" created`);
      setCreating(false);
      setDraft({ name: "", description: "", price: "" });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <GlassCard padding="sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-foreground font-semibold">All Add-ons</h2>
        <Button size="sm" variant="ghost" onClick={() => setCreating((c) => !c)}>
          {creating ? <X className="w-3.5 h-3.5 mr-1" /> : <PlusCircle className="w-3.5 h-3.5 mr-1" />}
          {creating ? "Cancel" : "New Add-on"}
        </Button>
      </div>

      {creating && (
        <div className="px-4 py-4 border-b border-border bg-secondary/20 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Name</label>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Community Access"
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Price (₹, one-time)</label>
              <input
                type="number"
                min={0}
                step="1"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                placeholder="499"
                className="input-glass w-full"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Description</label>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Shown on the storefront add-on cards."
              className="input-glass w-full h-20"
            />
          </div>
          <Button size="sm" loading={busyId === "new"} onClick={handleCreate}>
            Create Add-on
          </Button>
        </div>
      )}

      {features.length === 0 && !creating ? (
        <div className="text-center py-12 text-muted-foreground/70">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No add-ons yet. Create your first one.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {features.map((f) => {
            const isEditing = editingId === f.id;
            return (
              <div key={f.id} className="px-4 py-3.5 hover:bg-secondary/30 transition-colors">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Name</label>
                        <input
                          value={edit.name}
                          onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                          className="input-glass w-full"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Price (₹, one-time)</label>
                        <input
                          type="number"
                          min={0}
                          step="1"
                          value={edit.price}
                          onChange={(e) => setEdit({ ...edit, price: e.target.value })}
                          className="input-glass w-full"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Description</label>
                      <textarea
                        value={edit.description}
                        onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                        className="input-glass w-full h-20"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" loading={busyId === f.id} onClick={() => saveEdit(f)}>
                        Save Changes
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Package className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <h3 className="font-semibold text-foreground text-sm truncate">{f.name}</h3>
                          <span className="text-xs text-muted-foreground/60 flex-shrink-0">/{f.slug}</span>
                        </div>
                        {f.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{f.description}</p>
                        )}
                      </div>
                      <span className="text-base font-bold text-foreground flex-shrink-0">
                        ₹{f.price.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Badge variant={f.isActive ? "green" : "amber"}>
                        {f.isActive ? "ACTIVE" : "DISABLED"}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        {f.purchases.toLocaleString()} purchase{f.purchases === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={busyId === f.id}
                        onClick={() => toggleActive(f)}
                      >
                        {f.isActive ? "Disable" : "Enable"}
                      </Button>
                      <Button size="icon" variant="ghost" title="Edit price & details" onClick={() => startEdit(f)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title={f.purchases > 0 ? "Has purchases — disable instead" : "Delete"}
                        disabled={f.purchases > 0}
                        loading={busyId === f.id}
                        onClick={() => handleDelete(f)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
