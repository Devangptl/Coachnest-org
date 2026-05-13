"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap, ArrowRight, ArrowLeft, Loader2,
  BookOpen, Globe, Layers, CheckCircle2, SkipForward,
  Sparkles, User, Check,
} from "lucide-react";

interface Category {
  id:    string;
  slug:  string;
  name:  string;
  icon:  string | null;
  color: string | null;
}

interface Props {
  userName:   string;
  categories: Category[];
}

const STEPS = ["welcome", "profile", "topics", "links"] as const;
type Step = typeof STEPS[number];

const STEP_META: Record<Step, { label: string; icon: React.ElementType }> = {
  welcome: { label: "Welcome",   icon: Sparkles     },
  profile: { label: "Profile",   icon: User         },
  topics:  { label: "Expertise", icon: Layers       },
  links:   { label: "Links",     icon: Globe        },
};

export default function InstructorOnboardingClient({ userName, categories }: Props) {
  const router = useRouter();

  const [step,           setStep]           = useState<Step>("welcome");
  const [headline,       setHeadline]       = useState("");
  const [bio,            setBio]            = useState("");
  const [website,        setWebsite]        = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState("");

  const currentIdx = STEPS.indexOf(step);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function toggleTopic(id: string) {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // ── Submit (final) ─────────────────────────────────────────────────────────
  async function handleSubmit(opts: { skipAll?: boolean } = {}) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/instructor", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          opts.skipAll
            ? { complete: true }
            : {
                headline:      headline.trim() || undefined,
                bio:           bio.trim()      || undefined,
                website:       website.trim()  || null,
                teachingTopics: selectedTopics,
                complete:      true,
              }
        ),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save. Please try again.");
        return;
      }

      router.push("/instructor/pending");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  const profileValid = headline.trim().length >= 5 && bio.trim().length >= 20;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">

        {/* ── Step indicator ── */}
        <div className="flex items-center gap-1.5 mb-10">
          {STEPS.map((s, i) => {
            const done    = i < currentIdx;
            const active  = s === step;
            const Icon    = STEP_META[s].icon;
            return (
              <div key={s} className="flex items-center gap-1.5 flex-1 last:flex-none">
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full border text-xs font-semibold
                    transition-all duration-300 flex-shrink-0 ${
                    done   ? "bg-orange-500 border-orange-500 text-white" :
                    active ? "bg-orange-500/10 border-orange-500/60 text-orange-400" :
                             "bg-transparent border-border text-muted-foreground/40"
                  }`}
                >
                  {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                {/* connector line — not after last item */}
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-px rounded-full overflow-hidden bg-border">
                    <div
                      className="h-full bg-orange-500 transition-all duration-500"
                      style={{ width: i < currentIdx ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ════════════════════════════════════════════════════
            STEP 1 — Welcome
        ════════════════════════════════════════════════════ */}
        {step === "welcome" && (
          <div className="text-center animate-fade-in space-y-6">
            <div className="inline-flex w-16 h-16 rounded-xl bg-orange-500/10 border border-orange-500/20
                            items-center justify-center">
              <GraduationCap className="w-8 h-8 text-[#d97757]" />
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
                Welcome aboard, {userName}!
              </h1>
              <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
                Let&apos;s build your instructor profile so our team can review your application.
              </p>
              <p className="text-muted-foreground/60 text-sm mt-2 max-w-sm mx-auto">
                A strong profile helps us approve your application faster.
              </p>
            </div>

            {/* What you'll set up */}
            <div className="grid grid-cols-3 gap-3 text-left max-w-md mx-auto">
              {[
                { icon: User,     label: "Your headline & bio"   },
                { icon: Layers,   label: "Teaching expertise"     },
                { icon: Globe,    label: "Website & links"        },
              ].map(({ icon: Icon, label }) => (
                <div key={label}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border
                             bg-secondary/30 text-center"
                >
                  <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5 text-[#d97757]" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium leading-tight">{label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep("profile")}
                className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-base"
              >
                Set Up My Profile <ArrowRight className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => handleSubmit({ skipAll: true })}
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
            STEP 2 — Profile
        ════════════════════════════════════════════════════ */}
        {step === "profile" && (
          <div className="animate-fade-in space-y-6">
            <div>
              <div className="inline-flex w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20
                              items-center justify-center mb-4">
                <User className="w-5 h-5 text-[#d97757]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
                Tell us about yourself
              </h2>
              <p className="text-muted-foreground text-sm">
                This appears on your public instructor profile and helps our admin team verify you.
              </p>
            </div>

            <div className="space-y-5">
              {/* Headline */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  Headline <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value.slice(0, 120))}
                  placeholder="e.g. Senior React Developer & 5+ years teaching experience"
                  className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5
                             text-foreground placeholder:text-muted-foreground/50 text-sm
                             focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/60
                             transition-colors"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground/60">
                    A short tagline that appears below your name
                  </p>
                  <span className={`text-xs tabular-nums ${
                    headline.length > 100 ? "text-orange-400" : "text-muted-foreground/40"
                  }`}>
                    {headline.length}/120
                  </span>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  Professional Bio <span className="text-orange-500">*</span>
                </label>
                <textarea
                  rows={6}
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 2000))}
                  placeholder="Share your professional background, teaching experience, and what makes you a great instructor. Include your qualifications, industry expertise, and any relevant certifications."
                  className="w-full bg-secondary border border-border rounded-lg px-4 py-3
                             text-foreground placeholder:text-muted-foreground/50 text-sm
                             focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/60
                             resize-none transition-colors leading-relaxed"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground/60">
                    Minimum 20 characters — be specific about your experience
                  </p>
                  <span className={`text-xs tabular-nums ${
                    bio.length > 1800 ? "text-orange-400" : "text-muted-foreground/40"
                  }`}>
                    {bio.length}/2000
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
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
                  onClick={() => setStep("topics")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => setStep("topics")}
                  disabled={!profileValid}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            STEP 3 — Teaching topics
        ════════════════════════════════════════════════════ */}
        {step === "topics" && (
          <div className="animate-fade-in space-y-6">
            <div>
              <div className="inline-flex w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20
                              items-center justify-center mb-4">
                <Layers className="w-5 h-5 text-[#d97757]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
                What will you teach?
              </h2>
              <p className="text-muted-foreground text-sm">
                Select the topics you&apos;re planning to create courses in.{" "}
                <span className="text-muted-foreground/60">Optional — you can update this later.</span>
              </p>
            </div>

            {categories.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const selected = selectedTopics.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleTopic(cat.id)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-sm
                                    font-medium transition-all duration-200 ${
                          selected
                            ? "bg-orange-500 border-orange-500 text-white shadow-sm"
                            : "border-border text-muted-foreground bg-secondary/40 hover:border-orange-500/40 hover:text-foreground"
                        }`}
                      >
                        <BookOpen className={`w-3.5 h-3.5 ${selected ? "text-white" : "text-muted-foreground/60"}`} />
                        {cat.name}
                        {selected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
                {selectedTopics.length > 0 && (
                  <p className="text-xs text-orange-400 font-medium">
                    {selectedTopics.length} topic{selectedTopics.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground/50 text-sm">
                No categories available — you can add topics later from your profile.
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setStep("profile")}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground
                           hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={() => setStep("links")}
                className="btn-primary inline-flex items-center gap-2"
              >
                Continue
                {selectedTopics.length > 0 && (
                  <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-xs leading-none">
                    {selectedTopics.length}
                  </span>
                )}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            STEP 4 — Links
        ════════════════════════════════════════════════════ */}
        {step === "links" && (
          <div className="animate-fade-in space-y-6">
            <div>
              <div className="inline-flex w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20
                              items-center justify-center mb-4">
                <Globe className="w-5 h-5 text-[#d97757]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
                Your website & links
              </h2>
              <p className="text-muted-foreground text-sm">
                Optional — helps learners and our team learn more about you.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  Personal or portfolio website
                </label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-2.5
                               text-foreground placeholder:text-muted-foreground/50 text-sm
                               focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/60
                               transition-colors"
                  />
                </div>
              </div>

              {/* Summary of what will be submitted */}
              <div className="bg-secondary/50 border border-border rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Application summary
                </p>
                <ul className="space-y-2">
                  {[
                    { label: "Headline",  value: headline.trim()          || <span className="text-muted-foreground/40 italic">Not provided</span> },
                    { label: "Bio",       value: bio.trim().length > 60
                                                  ? bio.trim().slice(0, 60) + "…"
                                                  : bio.trim()             || <span className="text-muted-foreground/40 italic">Not provided</span> },
                    { label: "Topics",    value: selectedTopics.length > 0
                                                  ? `${selectedTopics.length} selected`
                                                  : <span className="text-muted-foreground/40 italic">None selected</span> },
                    { label: "Website",   value: website.trim()           || <span className="text-muted-foreground/40 italic">Not provided</span> },
                  ].map(({ label, value }) => (
                    <li key={label} className="flex items-start gap-3 text-sm">
                      <span className="text-muted-foreground/50 w-16 flex-shrink-0 text-xs mt-0.5">{label}</span>
                      <span className="text-foreground/80 flex-1 leading-snug">{value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setStep("topics")}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground
                           hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={saving}
                className="btn-primary inline-flex items-center gap-2 px-6"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Submit Application</>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
