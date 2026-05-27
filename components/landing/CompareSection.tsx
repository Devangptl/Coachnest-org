"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Trophy, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const features = [
  { label: "Free courses available", us: true, them: "Limited" },
  { label: "Verified certificates", us: true, them: "Paid add-on" },
  { label: "Interactive quizzes", us: true, them: "Some plans" },
  { label: "Progress tracking", us: true, them: true },
  { label: "70% instructor revenue", us: true, them: false },
  { label: "Lifetime course access", us: true, them: "Subscription" },
  { label: "Ad-free experience", us: true, them: false },
  { label: "Community & peer review", us: true, them: "Basic" },
  { label: "Mobile optimized", us: true, them: true },
  { label: "Priority support", us: true, them: false },
];

function Cell({ value, highlight }: { value: boolean | string; highlight?: boolean }) {
  if (value === true) {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center w-8 h-8 rounded-full",
          highlight
            ? "bg-emerald-500/15 text-emerald-500"
            : "bg-secondary text-muted-foreground/50"
        )}
      >
        <CheckCircle2 className="w-4 h-4" />
      </div>
    );
  }
  if (value === false) {
    return (
      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 text-destructive/40">
        <XCircle className="w-4 h-4" />
      </div>
    );
  }
  return (
    <span
      className={cn(
        "text-[11px] font-medium px-2 py-0.5 rounded-full leading-snug text-center",
        highlight
          ? "bg-primary/10 text-primary"
          : "bg-secondary text-muted-foreground/60"
      )}
    >
      {value}
    </span>
  );
}

export default function CompareSection() {
  return (
    <section className="py-20">

      <div className="max-w-3xl mx-auto relative z-10">

        {/* ── Heading ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-block text-primary text-xs font-semibold uppercase tracking-widest px-3 py-1 bg-primary/10 rounded-full mb-4">
            Compare
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Coachnest vs{" "}
            <span className="text-muted-foreground">the rest</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto text-base leading-relaxed">
            See why thousands of learners choose Coachnest over other platforms.
          </p>
        </motion.div>

        {/* ── Comparison table ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-md border border-border bg-secondary/20 overflow-hidden shadow-card"
        >
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_88px_88px] sm:grid-cols-[1fr_140px_140px] border-b border-border">
            {/* Feature column label */}
            <div className="px-4 sm:px-6 py-4 flex items-end">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Features
              </span>
            </div>

            {/* Coachnest header */}
            <div className="relative flex flex-col items-center justify-center py-4 px-2 bg-primary/10 border-x border-primary/20">
              {/* Top accent line */}
              <div className="absolute top-0 inset-x-0 h-[3px] bg-primary rounded-b-sm" />
              <Trophy className="w-4 h-4 text-primary mb-1.5" />
              <span className="text-primary font-bold text-xs sm:text-sm leading-tight text-center">
                Coachnest
              </span>
              <span className="text-primary/50 text-[9px] sm:text-[10px] uppercase tracking-wider mt-0.5 hidden sm:block">
                Our platform
              </span>
            </div>

            {/* Others header */}
            <div className="flex flex-col items-center justify-center py-4 px-2 bg-secondary/40">
              <Minus className="w-4 h-4 text-muted-foreground/40 mb-1.5" />
              <span className="text-muted-foreground/60 font-semibold text-xs sm:text-sm text-center leading-tight">
                Others
              </span>
              <span className="text-muted-foreground/30 text-[9px] sm:text-[10px] uppercase tracking-wider mt-0.5 hidden sm:block">
                Industry avg.
              </span>
            </div>
          </div>

          {/* Feature rows */}
          {features.map((row, i) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.15 + i * 0.04 }}
              className="grid grid-cols-[1fr_88px_88px] sm:grid-cols-[1fr_140px_140px] border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors"
            >
              {/* Feature label */}
              <div className="px-4 sm:px-6 py-3.5 flex items-center">
                <span className="text-foreground/85 text-sm font-medium leading-snug">
                  {row.label}
                </span>
              </div>

              {/* Coachnest value */}
              <div className="flex items-center justify-center py-3.5 bg-primary/[0.04] border-x border-primary/10">
                <Cell value={row.us} highlight />
              </div>

              {/* Others value */}
              <div className="flex items-center justify-center py-3.5">
                <Cell value={row.them} />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Bottom CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 flex justify-center"
        >
          <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-sm bg-secondary/20 border border-border rounded-full px-5 py-2.5 shadow-card">
            <span className="flex h-2 w-2 relative flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-muted-foreground">Experience the difference today.</span>
            <Link
              href="/signup"
              className="text-primary font-semibold hover:text-primary/80 transition-colors whitespace-nowrap"
            >
              Create free account →
            </Link>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
