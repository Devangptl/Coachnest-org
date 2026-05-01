"use client";

import { useState } from "react";
import GlassCard from "@/components/GlassCard";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Loader2,
  Code, Palette, GraduationCap, BookOpen, Briefcase, Laptop,
  Users, ToggleLeft, ToggleRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/Select";

// ── Types ────────────────────────────────────────────────────────────────────

interface Profession {
  id:             string;
  slug:           string;
  name:           string;
  description:    string;
  icon:           string;
  color:          string;
  courseKeywords: string[];
  isDefault:      boolean;
  isActive:       boolean;
  order:          number;
  _count:         { users: number };
}

interface ProfessionsClientProps {
  initialProfessions: Profession[];
}

// ── Icon lookup ───────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Code, Palette, GraduationCap, BookOpen, Briefcase, Laptop,
};

const ICON_OPTIONS = ["Code", "Palette", "GraduationCap", "BookOpen", "Briefcase", "Laptop"];
const COLOR_OPTIONS = ["blue", "purple", "green", "orange", "amber", "teal", "rose"];

const COLOR_CLASS: Record<string, string> = {
  blue:   "bg-blue-500/15 text-blue-400 border-blue-500/20",
  purple: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  green:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  orange: "bg-orange-500/15 text-[#d97757] border-orange-500/20",
  amber:  "bg-amber-500/15 text-amber-400 border-amber-500/20",
  teal:   "bg-teal-500/15 text-teal-400 border-teal-500/20",
  rose:   "bg-rose-500/15 text-rose-400 border-rose-500/20",
};

// ── Modal ─────────────────────────────────────────────────────────────────────

interface FormState {
  name:           string;
  description:    string;
  icon:           string;
  color:          string;
  courseKeywords: string;
  order:          string;
}

const EMPTY_FORM: FormState = {
  name: "", description: "", icon: "Code", color: "orange", courseKeywords: "", order: "99",
};

function ProfessionModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open:     boolean;
  editing:  Profession | null;
  onClose:  () => void;
  onSaved:  (p: Profession) => void;
}) {
  const [form,    setForm]    = useState<FormState>(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  // Populate form when editing prop changes
  useState(() => {
    if (editing) {
      setForm({
        name:           editing.name,
        description:    editing.description,
        icon:           editing.icon,
        color:          editing.color,
        courseKeywords: editing.courseKeywords.join(", "),
        order:          String(editing.order),
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError("");
  });

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      name:           form.name.trim(),
      description:    form.description.trim(),
      icon:           form.icon,
      color:          form.color,
      courseKeywords: form.courseKeywords
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean),
      order: Number(form.order),
    };

    try {
      const url    = editing ? `/api/admin/professions/${editing.id}` : "/api/admin/professions";
      const method = editing ? "PUT" : "POST";

      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to save.");
        return;
      }

      onSaved(data.profession);
      onClose();
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const PreviewIcon = ICON_MAP[form.icon] ?? Code;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-md shadow-2xl w-full max-w-lg p-6 animate-fade-in">
        <h2 className="text-xl font-bold text-foreground mb-5">
          {editing ? "Edit Profession" : "Add Profession"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Name */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground
                         placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#d97757]/40"
              placeholder="e.g. Data Scientist" />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Description *</label>
            <textarea required rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground
                         placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#d97757]/40 resize-none"
              placeholder="Short description shown on the card" />
          </div>

          {/* Icon + Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Icon</label>
              <Select
                value={form.icon}
                onValueChange={(v) => setForm({ ...form, icon: v })}
                options={ICON_OPTIONS.map((i) => ({ value: i, label: i }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Color</label>
              <Select
                value={form.color}
                onValueChange={(v) => setForm({ ...form, color: v })}
                options={COLOR_OPTIONS.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 bg-secondary/60 rounded-lg p-3">
            <div className={cn("w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0",
              COLOR_CLASS[form.color] ?? COLOR_CLASS["orange"])}>
              <PreviewIcon className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{form.name || "Profession name"}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">{form.description || "Description"}</p>
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              Course keywords <span className="text-muted-foreground/60 font-normal">(comma-separated)</span>
            </label>
            <input value={form.courseKeywords}
              onChange={(e) => setForm({ ...form, courseKeywords: e.target.value })}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground
                         placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#d97757]/40"
              placeholder="e.g. programming, javascript, backend" />
            <p className="text-xs text-muted-foreground/60 mt-1">
              Used to match courses for personalised recommendations.
            </p>
          </div>

          {/* Order */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Display order</label>
            <input type="number" min={0} max={999} value={form.order}
              onChange={(e) => setForm({ ...form, order: e.target.value })}
              className="w-28 bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground
                         focus:outline-none focus:border-[#d97757]/40" />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground
                         hover:bg-secondary transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="btn-primary inline-flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? "Save Changes" : "Add Profession"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ProfessionsClient({ initialProfessions }: ProfessionsClientProps) {
  const [professions, setProfessions] = useState<Profession[]>(initialProfessions);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editing,     setEditing]     = useState<Profession | null>(null);
  const [togglingId,  setTogglingId]  = useState<string | null>(null);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(p: Profession) { setEditing(p); setModalOpen(true); }

  function handleSaved(saved: Profession) {
    setProfessions((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx === -1) return [...prev, { ...saved, _count: { users: 0 } }];
      return prev.map((p) => (p.id === saved.id ? { ...p, ...saved } : p));
    });
  }

  async function toggleActive(p: Profession) {
    setTogglingId(p.id);
    try {
      const res  = await fetch(`/api/admin/professions/${p.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ isActive: !p.isActive }),
      });
      if (res.ok) {
        setProfessions((prev) =>
          prev.map((x) => (x.id === p.id ? { ...x, isActive: !p.isActive } : x))
        );
      }
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(p: Profession) {
    if (!confirm(`Delete "${p.name}"? This will remove it from all users' profiles.`)) return;
    setDeletingId(p.id);
    try {
      const res = await fetch(`/api/admin/professions/${p.id}`, { method: "DELETE" });
      if (res.ok) {
        setProfessions((prev) => prev.filter((x) => x.id !== p.id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <ProfessionModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />

      <GlassCard>
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-muted-foreground">
            {professions.length} profession{professions.length !== 1 ? "s" : ""} total ·{" "}
            {professions.filter((p) => p.isActive).length} active
          </p>
          <button onClick={openCreate} className="btn-primary inline-flex items-center gap-1.5 text-sm py-2">
            <Plus className="w-4 h-4" /> Add Profession
          </button>
        </div>

        {professions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No professions yet.</div>
        ) : (
          <div className="space-y-2">
            {professions.map((p) => {
              const Icon = ICON_MAP[p.icon] ?? Code;
              const colorCls = COLOR_CLASS[p.color] ?? COLOR_CLASS["orange"];

              return (
                <div key={p.id}
                  className={cn(
                    "flex items-center gap-4 rounded-md border p-4 transition-all",
                    p.isActive ? "border-border bg-secondary/30" : "border-border/50 bg-secondary/10 opacity-60"
                  )}>

                  {/* Icon */}
                  <div className={cn("w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0", colorCls)}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{p.name}</span>
                      {!p.isActive && (
                        <span className="text-[10px] bg-muted-foreground/15 text-muted-foreground px-1.5 py-0.5 rounded-full">
                          Hidden
                        </span>
                      )}
                      {!p.isDefault && (
                        <span className="text-[10px] bg-violet-500/15 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded-full">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.description}</p>
                    {p.courseKeywords.length > 0 && (
                      <p className="text-[10px] text-muted-foreground/60 mt-1 truncate">
                        Keywords: {p.courseKeywords.join(", ")}
                      </p>
                    )}
                  </div>

                  {/* User count */}
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                    <Users className="w-3.5 h-3.5" />
                    {p._count.users}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Toggle active */}
                    <button
                      onClick={() => toggleActive(p)}
                      disabled={togglingId === p.id}
                      title={p.isActive ? "Hide from onboarding" : "Show in onboarding"}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                    >
                      {togglingId === p.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : p.isActive
                          ? <ToggleRight className="w-4 h-4 text-emerald-400" />
                          : <ToggleLeft className="w-4 h-4" />}
                    </button>

                    {/* Edit */}
                    <button onClick={() => openEdit(p)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(p)}
                      disabled={deletingId === p.id}
                      className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      {deletingId === p.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </>
  );
}
