"use client";

import { useTheme } from "@/components/ThemeProvider";

/**
 * Supabase-inspired hero background — clean, minimal, with subtle gradient
 * radials and a faint grid. No heavy framer-motion animations or orbiting rings.
 */
export default function HeroBackground() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* ── Base gradient ───────────────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background: isLight
            ? "linear-gradient(180deg, rgba(255,247,237,0.6) 0%, rgba(255,255,255,0) 60%)"
            : "linear-gradient(180deg, rgba(15,10,5,0.9) 0%, transparent 60%)",
        }}
      />

      {/* ── Top-center radial glow ─────────────────────────────────── */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px]"
        style={{
          background: isLight
            ? "radial-gradient(ellipse at center, rgba(249,115,22,0.08) 0%, transparent 70%)"
            : "radial-gradient(ellipse at center, rgba(249,115,22,0.12) 0%, transparent 70%)",
        }}
      />

      {/* ── Left accent glow ───────────────────────────────────────── */}
      <div
        className="absolute top-[20%] -left-[10%] w-[500px] h-[500px] rounded-full"
        style={{
          background: isLight
            ? "radial-gradient(circle, rgba(251,146,60,0.06) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(234,88,12,0.08) 0%, transparent 70%)",
        }}
      />

      {/* ── Right accent glow ──────────────────────────────────────── */}
      <div
        className="absolute top-[30%] -right-[10%] w-[500px] h-[500px] rounded-full"
        style={{
          background: isLight
            ? "radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)",
        }}
      />

      {/* ── Subtle grid pattern ────────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: isLight
            ? `linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
               linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)`
            : `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
               linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
        }}
      />

      {/* ── Bottom fade to page background ─────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: isLight
            ? "linear-gradient(to top, var(--background) 0%, transparent 100%)"
            : "linear-gradient(to top, var(--background) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
