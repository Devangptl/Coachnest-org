"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import {
  TEAM_SIZES,
  TIME_SLOTS,
  DEMO_INTERESTS,
  type TeamSize,
  type TimeSlot,
  type DemoInterest,
} from "@/lib/demo-request-options";

interface FormData {
  name: string;
  email: string;
  phone: string;
  organization: string;
  jobTitle: string;
  teamSize: TeamSize | "";
  interests: DemoInterest[];
  preferredDate: string;
  preferredTimeSlot: TimeSlot | "";
  message: string;
}

type FieldErrors = Partial<Record<keyof FormData, string[]>>;

const STEPS = [
  { title: "About you", subtitle: "How can we reach you?" },
  { title: "Your organization", subtitle: "What should we focus on?" },
  { title: "Scheduling", subtitle: "When works best for you?" },
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RequestDemoForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    organization: "",
    jobTitle: "",
    teamSize: "",
    interests: [],
    preferredDate: "",
    preferredTimeSlot: "",
    message: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "";
    }
  }, []);

  const minDate = useMemo(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return d.toISOString().split("T")[0];
  }, []);

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function toggleInterest(interest: DemoInterest) {
    setField(
      "interests",
      form.interests.includes(interest)
        ? form.interests.filter((i) => i !== interest)
        : [...form.interests, interest]
    );
  }

  function validateStep(s: number): boolean {
    const next: FieldErrors = {};
    if (s === 0) {
      if (form.name.trim().length < 2) next.name = ["Name must be at least 2 characters"];
      if (!EMAIL_RE.test(form.email.trim())) next.email = ["Please enter a valid email address"];
      if (form.phone.trim() && !/^[+\d][\d\s()-]*$/.test(form.phone.trim()))
        next.phone = ["Please enter a valid phone number"];
    }
    if (s === 1) {
      if (form.organization.trim().length < 2)
        next.organization = ["Organization must be at least 2 characters"];
      if (form.interests.length === 0) next.interests = ["Pick at least one area of interest"];
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleNext() {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep(step)) return;
    setLoading(true);

    try {
      const res = await fetch("/api/demo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          organization: form.organization.trim(),
          jobTitle: form.jobTitle.trim(),
          teamSize: form.teamSize || undefined,
          interests: form.interests,
          preferredDate: form.preferredDate,
          preferredTimeSlot: form.preferredTimeSlot || undefined,
          timezone,
          message: form.message.trim(),
          source: "request-demo-page",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors);
          const firstErrorField = Object.keys(data.errors)[0] as keyof FormData;
          if (["name", "email", "phone"].includes(firstErrorField)) setStep(0);
          else if (["organization", "jobTitle", "teamSize", "interests"].includes(firstErrorField)) setStep(1);
        }
        toast.error(data.error || "Something went wrong.");
        return;
      }

      setSubmitted(true);
      toast.success("Demo request submitted!");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ─── Success state ────────────────────────────────────
  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-md border border-border/60 bg-secondary/20 p-10 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          className="w-20 h-20 mx-auto rounded-full bg-green-500/15 border border-green-400/25 flex items-center justify-center mb-6"
        >
          <CheckCircle2 className="w-10 h-10 text-green-400" />
        </motion.div>
        <h3 className="text-2xl font-bold text-foreground mb-2">Request Received!</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          Thanks, {form.name.split(" ")[0]}! A confirmation has been sent to{" "}
          <span className="text-foreground font-medium">{form.email}</span>. Our team will
          reach out within 1 business day to confirm your demo.
        </p>
        <div className="rounded-md border border-border/60 bg-secondary/30 p-4 max-w-sm mx-auto text-left space-y-2 mb-8">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-orange-500" />
            {form.organization}
          </p>
          {form.preferredDate && (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-orange-500" />
              Preferred: {form.preferredDate}
              {form.preferredTimeSlot ? ` · ${form.preferredTimeSlot}` : ""}
            </p>
          )}
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            {form.interests.join(", ")}
          </p>
        </div>
      </motion.div>
    );
  }

  const inputClass = (key: keyof FormData) =>
    cn(
      "input-glass",
      errors[key] && "border-red-400/60 focus:border-red-400 focus:ring-red-400/30"
    );

  function fieldError(key: keyof FormData) {
    return (
      <AnimatePresence>
        {errors[key] && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-red-400 text-xs mt-1.5"
          >
            {errors[key]![0]}
          </motion.p>
        )}
      </AnimatePresence>
    );
  }

  // ─── Form ─────────────────────────────────────────────
  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="rounded-md border border-border/60 bg-secondary/20 p-6 sm:p-8"
    >
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-foreground">
            {STEPS[step].title}
            <span className="text-muted-foreground font-normal ml-2">{STEPS[step].subtitle}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </p>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= step ? "bg-orange-500" : "bg-border"
              )}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
          className="space-y-5"
        >
          {step === 0 && (
            <>
              <div>
                <label htmlFor="demo-name" className="label flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="demo-name"
                  type="text"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  className={inputClass("name")}
                />
                {fieldError("name")}
              </div>

              <div>
                <label htmlFor="demo-email" className="label flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Work Email <span className="text-red-400">*</span>
                </label>
                <input
                  id="demo-email"
                  type="email"
                  placeholder="john@company.com"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  className={inputClass("email")}
                />
                {fieldError("email")}
              </div>

              <div>
                <label htmlFor="demo-phone" className="label flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  Phone <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <input
                  id="demo-phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  className={inputClass("phone")}
                />
                {fieldError("phone")}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <label htmlFor="demo-org" className="label flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Organization <span className="text-red-400">*</span>
                </label>
                <input
                  id="demo-org"
                  type="text"
                  placeholder="Acme Academy"
                  value={form.organization}
                  onChange={(e) => setField("organization", e.target.value)}
                  className={inputClass("organization")}
                />
                {fieldError("organization")}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="demo-title" className="label flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Your Role <span className="text-muted-foreground text-xs">(optional)</span>
                  </label>
                  <input
                    id="demo-title"
                    type="text"
                    placeholder="Head of L&D"
                    value={form.jobTitle}
                    onChange={(e) => setField("jobTitle", e.target.value)}
                    className={inputClass("jobTitle")}
                  />
                </div>
                <div>
                  <label htmlFor="demo-team" className="label flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Team Size <span className="text-muted-foreground text-xs">(optional)</span>
                  </label>
                  <select
                    id="demo-team"
                    value={form.teamSize}
                    onChange={(e) => setField("teamSize", e.target.value as TeamSize | "")}
                    className={inputClass("teamSize")}
                  >
                    <option value="">Select team size</option>
                    {TEAM_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size} people
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  What would you like to see? <span className="text-red-400">*</span>
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {DEMO_INTERESTS.map((interest) => {
                    const active = form.interests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                          active
                            ? "bg-orange-500/15 border-[#d97757]/40 text-orange-400"
                            : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                        )}
                      >
                        {active && <CheckCircle2 className="w-3 h-3 inline mr-1.5 -mt-px" />}
                        {interest}
                      </button>
                    );
                  })}
                </div>
                {fieldError("interests")}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label htmlFor="demo-date" className="label flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Preferred Date <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <input
                  id="demo-date"
                  type="date"
                  min={minDate}
                  value={form.preferredDate}
                  onChange={(e) => setField("preferredDate", e.target.value)}
                  className={inputClass("preferredDate")}
                />
                {fieldError("preferredDate")}
              </div>

              <div>
                <label className="label flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Preferred Time <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                  {TIME_SLOTS.map((slot) => {
                    const active = form.preferredTimeSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setField("preferredTimeSlot", active ? "" : slot)}
                        className={cn(
                          "px-3 py-2.5 rounded-lg text-xs font-medium border text-center transition-all",
                          active
                            ? "bg-orange-500/15 border-[#d97757]/40 text-orange-400"
                            : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                        )}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {timezone && (
                <p className="text-muted-foreground text-xs flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  Times shown in your timezone: {timezone}
                </p>
              )}

              <div>
                <label htmlFor="demo-message" className="label flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Anything else? <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <textarea
                  id="demo-message"
                  rows={4}
                  placeholder="Tell us about your team, goals, or specific questions..."
                  value={form.message}
                  onChange={(e) => setField("message", e.target.value)}
                  className={cn(inputClass("message"), "resize-none")}
                />
                <div className="flex justify-between items-center mt-1">
                  {fieldError("message")}
                  <span className="text-muted-foreground text-xs ml-auto">
                    {form.message.length} / 2000
                  </span>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center gap-3 mt-8">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="btn-secondary px-5 py-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <motion.button
            type="button"
            onClick={handleNext}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary flex-1 py-3"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        ) : (
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary flex-1 py-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Request Demo
              </>
            )}
          </motion.button>
        )}
      </div>

      <p className="text-muted-foreground text-xs text-center mt-4">
        No commitment required. We&apos;ll confirm your demo within 1 business day.
      </p>
    </motion.form>
  );
}
