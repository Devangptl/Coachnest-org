"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles, ArrowRight, ArrowLeft, Loader2, SkipForward,
  GraduationCap, Briefcase, CheckCircle2, BookOpen,
  Users, TrendingUp, Check,
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

const STEP_META: Record<Step, { label: string; icon: React.ElementType }> = {
  welcome:     { label: "Welcome",     icon: Sparkles      },
  professions: { label: "Profession",  icon: Briefcase     },
  instructors: { label: "Instructors", icon: GraduationCap },
  done:        { label: "Done",        icon: CheckCircle2  },
};

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

  const currentIdx       = STEPS.indexOf(step);
  const totalProfessions = selectedIds.length + customNames.length;

  useEffect(() => {
    if (step !== "done") return;
    const t = setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 2500);
    return () => clearTimeout(t);
  }, [step, router]);

  function handleToggleProfession(id: string) {
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

  function handleToggleInstructor(id: string) {
    setSelectedInstructorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

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

      setStep("done");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-10">

      {/* Logo */}
      <div className="mb-10 self-center">
        <Link href="/">
          <img src="/logo.png" alt="Coachnest" className="h-7 w-auto object-contain" />
        </Link>
      </div>

      <div className="w-full max-w-2xl">

        {/* Step indicator */}
        {step !== "done" && (
          <div className="flex items-center gap-0 mb-10">
            {STEPS.filter((s) => s !== "done").map((s, i, arr) => {
              const done   = currentIdx > STEPS.indexOf(s);
              const active = s === step;
              const Icon   = STEP_META[s].icon;
              return (
                <div key={s} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2
                        transition-all duration-300 ${
                        done   ? "bg-primary border-primary text-primary-foreground" :
                        active ? "bg-primary/10 border-primary text-primary" :
                                 "bg-transparent border-border text-muted-foreground/30"
                      }`}
                    >
                      {done
                        ? <Check className="w-4 h-4" strokeWidth={2.5} />
                        : <Icon className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`text-xs font-medium whitespace-nowrap transition-colors ${
                      active ? "text-foreground" : "text-muted-foreground/50"
                    }`}>
                      {STEP_META[s].label}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="flex-1 h-px mx-3 mb-5 rounded-full overflow-hidden bg-border">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: done ? "100%" : "0%" }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── STEP 1: Welcome ── */}
        {step === "welcome" && (
          <div className="text-center animate-fade-in space-y-7">
            <div className="inline-flex w-16 h-16 rounded-xl bg-primary/10 border border-primary/20
                            items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
                Welcome, {userName}!
              </h1>
              <p className="text-muted-foreground text-base max-w-md mx-auto leading-relaxed">
                Let&apos;s personalise your learning experience in just two quick steps.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-left">
              {[
                { icon: Briefcase,     label: "Pick your profession",      color: "text-primary",        bg: "bg-primary/10 border-primary/20"      },
                { icon: GraduationCap, label: "Follow top instructors",    color: "text-purple-400",     bg: "bg-purple-500/10 border-purple-500/20" },
                { icon: TrendingUp,    label: "Get tailored course picks", color: "text-emerald-400",    bg: "bg-emerald-500/10 border-emerald-500/20" },
              ].map(({ icon: Icon, label, color, bg }) => (
                <div key={label}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-secondary text-center"
                >
                  <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${bg}`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium leading-tight">{label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
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

        {/* ── STEP 2: Profession picker ── */}
        {step === "professions" && (
          <div className="animate-fade-in space-y-6">
            <div>
              <div className="inline-flex w-10 h-10 rounded-lg bg-primary/10 border border-primary/20
                              items-center justify-center mb-4">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1.5">
                What describes you best?
              </h2>
              <p className="text-muted-foreground text-sm">
                Select one or more — we&apos;ll recommend courses that fit your career.{" "}
                <span className="text-muted-foreground/60">You can update this anytime.</span>
              </p>
            </div>

            <ProfessionPicker
              professions={professions}
              selectedIds={selectedIds}
              customNames={customNames}
              onToggle={handleToggleProfession}
              onAddCustom={handleAddCustom}
              onRemoveCustom={handleRemoveCustom}
            />

            <div className="flex items-center justify-between pt-5 border-t border-border">
              <button
                type="button"
                onClick={() => setStep("welcome")}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground
                           hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
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

        {/* ── STEP 3: Instructor picker ── */}
        {step === "instructors" && (
          <div className="animate-fade-in space-y-6">
            <div>
              <div className="inline-flex w-10 h-10 rounded-lg bg-primary/10 border border-primary/20
                              items-center justify-center mb-4">
                <GraduationCap className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1.5">
                Follow instructors
              </h2>
              <p className="text-muted-foreground text-sm">
                Get notified when your favourite instructors release new courses.{" "}
                <span className="text-muted-foreground/60">Optional.</span>
              </p>
            </div>

            <InstructorPicker
              popularInstructors={popularInstructors}
              selectedIds={selectedInstructorIds}
              onToggle={handleToggleInstructor}
            />

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20
                            rounded-lg px-4 py-2.5">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between pt-5 border-t border-border">
              <button
                type="button"
                onClick={() => setStep("professions")}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground
                           hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
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
                  disabled={saving}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  ) : (
                    <>
                      Finish Setup
                      {selectedInstructorIds.length > 0 && (
                        <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-xs leading-none">
                          {selectedInstructorIds.length}
                        </span>
                      )}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Done ── */}
        {step === "done" && (
          <div className="text-center animate-fade-in space-y-7">
            <div className="inline-flex w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/25
                            items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
                You&apos;re all set!
              </h1>
              <p className="text-muted-foreground text-base max-w-sm mx-auto leading-relaxed">
                Your profile is personalised. Taking you to your dashboard…
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2.5 max-w-sm mx-auto">
              {totalProfessions > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                                 bg-primary/10 border border-primary/20 text-primary
                                 text-xs font-medium">
                  <Briefcase className="w-3.5 h-3.5" />
                  {totalProfessions} profession{totalProfessions !== 1 ? "s" : ""} selected
                </span>
              )}
              {selectedInstructorIds.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                                 bg-purple-500/10 border border-purple-500/20 text-purple-400
                                 text-xs font-medium">
                  <Users className="w-3.5 h-3.5" />
                  {selectedInstructorIds.length} instructor{selectedInstructorIds.length !== 1 ? "s" : ""} followed
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                               bg-emerald-500/10 border border-emerald-500/20 text-emerald-400
                               text-xs font-medium">
                <BookOpen className="w-3.5 h-3.5" />
                Dashboard ready
              </span>
            </div>

            <button
              type="button"
              onClick={() => { router.push("/dashboard"); router.refresh(); }}
              className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-base"
            >
              Go to Dashboard <ArrowRight className="w-5 h-5" />
            </button>

            <p className="text-xs text-muted-foreground/50">Redirecting automatically…</p>
          </div>
        )}

      </div>
    </div>
  );
}
