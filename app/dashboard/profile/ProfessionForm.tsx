"use client";

/**
 * ProfessionForm — manage profession selections from the profile page.
 * Loads available professions and the user's current selections.
 * Allows adding / removing standard and custom professions.
 */

import { useState, useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import ProfessionPicker from "@/components/ProfessionPicker";
import { ProfessionData } from "@/components/ProfessionCard";
import { Button } from "@/components/ui/Button";

interface UserProfession {
  id:           string;
  professionId: string | null;
  customName:   string | null;
}

export default function ProfessionForm() {
  const [professions,   setProfessions]   = useState<ProfessionData[]>([]);
  const [selectedIds,   setSelectedIds]   = useState<string[]>([]);
  const [customNames,   setCustomNames]   = useState<string[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [message,       setMessage]       = useState<{type:"success"|"error"; text:string} | null>(null);

  // Load professions list + user's current selections
  useEffect(() => {
    async function init() {
      try {
        const [profRes, userRes] = await Promise.all([
          fetch("/api/professions"),
          fetch("/api/onboarding"),
        ]);
        const profData = await profRes.json();
        const userData = await userRes.json();

        setProfessions(profData.professions ?? []);

        const userProfs: UserProfession[] = userData.professions ?? [];
        setSelectedIds(
          userProfs
            .filter((up) => up.professionId !== null)
            .map((up) => up.professionId as string)
        );
        setCustomNames(
          userProfs
            .filter((up) => up.customName !== null)
            .map((up) => up.customName as string)
        );
      } catch {
        // silently fail — user can still edit
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  function handleToggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setMessage(null);
  }

  function handleAddCustom(name: string) {
    setCustomNames((prev) => [...prev, name]);
    setMessage(null);
  }

  function handleRemoveCustom(index: number) {
    setCustomNames((prev) => prev.filter((_, i) => i !== index));
    setMessage(null);
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/onboarding", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionIds: selectedIds,
          customNames,
          complete:      true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "error", text: data.error ?? "Failed to save." });
      } else {
        setMessage({ type: "success", text: "Professions updated successfully!" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <GlassCard>
      <div className="flex items-center gap-2.5 mb-5">
        <Sparkles className="w-4.5 h-4.5 text-orange-400" />
        <h2 className="text-lg font-semibold text-foreground">My Professions</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Your selections help us recommend courses that match your goals and career.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      ) : (
        <>
          <ProfessionPicker
            professions={professions}
            selectedIds={selectedIds}
            customNames={customNames}
            onToggle={handleToggle}
            onAddCustom={handleAddCustom}
            onRemoveCustom={handleRemoveCustom}
          />

          {message && (
            <div className={`mt-5 text-sm px-4 py-2.5 rounded-md border ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-300"
                : "bg-red-500/10 border-red-400/30 text-red-300"
            }`}>
              {message.text}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {selectedIds.length + customNames.length} profession{selectedIds.length + customNames.length !== 1 ? "s" : ""} selected
            </p>
            <Button onClick={handleSave} loading={saving}>
              Save Professions
            </Button>
          </div>
        </>
      )}
    </GlassCard>
  );
}
