"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, ArrowRight, Loader2, SkipForward, GraduationCap,
} from "lucide-react";
import ProfessionPicker from "@/components/ProfessionPicker";
import { ProfessionData } from "@/components/ProfessionCard";
import InstructorPicker, { InstructorData } from "@/components/InstructorPicker";

interface OnboardingClientProps {
  userName:           string;
  professions:        ProfessionData[];
  popularInstructors: InstructorData[];
}

const STEPS = ["welcome", "professions", "instructors", "done"] as const;
type Step = typeof STEPS[number];

export default function OnboardingClient({
  userName,
  professions,
  popularInstructors,
}: OnboardingClientProps) {
  const router = useRouter();

  const [step,                  setStep]                  = useState<Step>("welcome");
  const [selectedIds,           setSelectedIds]           = useState<string[]>([]);
  const [customNames,           setCustomNames]           = useState<string[]>([]);
  const [selectedInstructorIds, setSelectedInstructorIds] = useState<string[]>([]);
  const [saving,                setSaving]                = useState(false);
  const [error,                 setError]                 = useState("");

  // ── Profession handlers ──────────────────────────────────────────────────────
  function handleToggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleAddCustom(name: string) {
    setCustomNames((prev) => [...prev, name]);
  }

  function handleRemoveCustom(index: number) {
    setCustomNames((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Instructor handler ───────────────────────────────────────────────────────
  function handleToggleInstructor(id: string) {
    setSelectedInstructorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // ── Save (called only from the instructors step or "skip for now") ────────────
  async function handleSave(opts: { skipAll?: boolean } = {}) {
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionIds: opts.skipAll ? [] : selectedIds,
          customNames:   opts.skipAll ? [] : customNames,
          instructorIds: opts.skipAll ? [] : selectedInstructorIds,
          complete:      true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save. Please try again.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const totalProfessions = selectedIds.length + customNames.length;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">

        {/* ── Progress bar ── */}
        <div className="flex gap-1.5 mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 h-1.5 rounded-full overflow-hidden bg-border">
              <div
                className="h-full bg-orange-500 transition-all duration-500 rounded-full"
                style={{ width: STEPS.indexOf(step) >= i ? "100%" : "0%" }}
              />
            </div>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════
            STEP 1 — Welcome
        ════════════════════════════════════════════════════ */}
        {step === "welcome" && (
          <div className="text-center animate-fade-in">
            <div className="inline-flex w-16 h-16 rounded-md bg-orange-500/10 border border-orange-500/20
                            items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-[#d97757]" />
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Welcome, {userName}!
            </h1>
            <p className="text-muted-foreground text-lg mb-2 max-w-md mx-auto leading-relaxed">
              Let&apos;s personalise your learning experience.
            </p>
            <p className="text-muted-foreground/70 text-sm mb-10 max-w-sm mx-auto">
              Tell us about your profession so we can recommend the most relevant courses for you.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setStep("professions")}
                className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-base"
              >
                Get Started <ArrowRight className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => handleSave({ skipAll: true })}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm
                           text-muted-foreground hover:text-foreground transition-colors"
              >
                {saving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <SkipForward className="w-4 h-4" />}
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            STEP 2 — Profession picker
        ════════════════════════════════════════════════════ */}
        {step === "professions" && (
          <div className="animate-fade-in">
            <div className="mb-7">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                What describes you best?
              </h2>
              <p className="text-muted-foreground text-sm">
                Select one or more — you can change this anytime in your profile.
              </p>
            </div>

            <ProfessionPicker
              professions={professions}
              selectedIds={selectedIds}
              customNames={customNames}
              onToggle={handleToggle}
              onAddCustom={handleAddCustom}
              onRemoveCustom={handleRemoveCustom}
            />

            <div className="flex items-center justify-between mt-8 pt-5 border-t border-border">
              <button
                type="button"
                onClick={() => setStep("welcome")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep("instructors")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => setStep("instructors")}
                  disabled={totalProfessions === 0}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  Continue
                  {totalProfessions > 0 && (
                    <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-xs leading-none">
                      {totalProfessions}
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            STEP 3 — Instructor picker (optional)
        ════════════════════════════════════════════════════ */}
        {step === "instructors" && (
          <div className="animate-fade-in">
            <div className="mb-7">
              <div className="inline-flex w-10 h-10 rounded-md bg-orange-500/10 border border-orange-500/20
                              items-center justify-center mb-4">
                <GraduationCap className="w-5 h-5 text-[#d97757]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Follow instructors
              </h2>
              <p className="text-muted-foreground text-sm">
                Optional — follow instructors to stay updated on their new courses.
              </p>
            </div>

            <InstructorPicker
              popularInstructors={popularInstructors}
              selectedIds={selectedInstructorIds}
              onToggle={handleToggleInstructor}
            />

            {error && (
              <p className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20
                            rounded-lg px-4 py-2.5">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between mt-8 pt-5 border-t border-border">
              <button
                type="button"
                onClick={() => setStep("professions")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={saving}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={saving || selectedInstructorIds.length === 0}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  {saving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    : <>
                        Finish Setup
                        {selectedInstructorIds.length > 0 && (
                          <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-xs leading-none">
                            {selectedInstructorIds.length}
                          </span>
                        )}
                        <ArrowRight className="w-4 h-4" />
                      </>}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
