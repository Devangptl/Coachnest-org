"use client";

/**
 * ProfessionPicker
 * Multi-select profession chooser with search + custom profession entry.
 *
 * Props:
 *   professions     – list of predefined professions from /api/professions
 *   selectedIds     – currently selected profession IDs
 *   customNames     – array of custom profession name strings
 *   onToggle        – called when a predefined card is clicked
 *   onAddCustom     – called to add a custom profession name
 *   onRemoveCustom  – called to remove a custom profession name by index
 */

import { useState, KeyboardEvent } from "react";
import { Search, Plus, X } from "lucide-react";
import ProfessionCard, { ProfessionData } from "@/components/ProfessionCard";
import { cn } from "@/lib/utils";

interface ProfessionPickerProps {
  professions:    ProfessionData[];
  selectedIds:    string[];
  customNames:    string[];
  onToggle:       (id: string) => void;
  onAddCustom:    (name: string) => void;
  onRemoveCustom: (index: number) => void;
}

export default function ProfessionPicker({
  professions,
  selectedIds,
  customNames,
  onToggle,
  onAddCustom,
  onRemoveCustom,
}: ProfessionPickerProps) {
  const [query, setQuery]       = useState("");
  const [customInput, setCustomInput] = useState("");

  const filtered = professions.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.description.toLowerCase().includes(query.toLowerCase())
  );

  function handleAddCustom() {
    const name = customInput.trim();
    if (!name) return;
    if (customNames.includes(name)) return;
    onAddCustom(name);
    setCustomInput("");
  }

  function handleCustomKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustom();
    }
  }

  const totalSelected = selectedIds.length + customNames.length;

  return (
    <div className="space-y-5">

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search professions…"
          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 pl-10
                     text-sm text-foreground placeholder:text-muted-foreground/50
                     focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>

      {/* Selection count badge */}
      {totalSelected > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {totalSelected} selected
          </span>
          {selectedIds.map((id) => {
            const p = professions.find((x) => x.id === id);
            if (!p) return null;
            return (
              <span key={id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                           bg-primary/10 border border-primary/20 text-primary
                           text-xs font-medium">
                {p.name}
                <button type="button" onClick={() => onToggle(id)}
                  className="hover:text-primary/70 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
          {customNames.map((name, i) => (
            <span key={`custom-${i}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                         bg-violet-500/10 border border-violet-500/20 text-violet-400
                         text-xs font-medium">
              {name}
              <button type="button" onClick={() => onRemoveCustom(i)}
                className="hover:text-violet-300 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Profession grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <ProfessionCard
              key={p.id}
              profession={p}
              selected={selectedIds.includes(p.id)}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground py-8">
          No matching professions found.
        </p>
      )}

      {/* Custom profession input */}
      <div className="border-t border-border pt-5">
        <p className="text-sm font-medium text-foreground mb-3">
          Don&apos;t see yours?{" "}
          <span className="text-muted-foreground font-normal">Add a custom profession</span>
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={handleCustomKeyDown}
            placeholder="e.g. Data Scientist, Nurse, Chef…"
            maxLength={60}
            className={cn(
              "flex-1 bg-secondary border border-border rounded-lg px-4 py-2.5",
              "text-sm text-foreground placeholder:text-muted-foreground/50",
              "focus:outline-none focus:border-primary/40 transition-colors"
            )}
          />
          <button
            type="button"
            onClick={handleAddCustom}
            disabled={!customInput.trim() || customNames.length >= 5}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              customInput.trim() && customNames.length < 5
                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
        {customNames.length >= 5 && (
          <p className="text-xs text-amber-400 mt-2">Maximum 5 custom professions.</p>
        )}
      </div>
    </div>
  );
}
