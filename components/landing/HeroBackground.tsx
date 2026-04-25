"use client";

import { useTheme } from "@/components/ThemeProvider";

/**
 * Aesthetic hero background — layered gradient orbs, faint grid, and a
 * subtle conic shimmer. Pure CSS (no framer-motion) for performance.
 */
export default function HeroBackground() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">

      {/* ── Soft top spotlight ───────────────────────────────────────── */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] opacity-70"
        style={{
          background: isLight
            ? "radial-gradient(ellipse at center, rgba(249,115,22,0.18) 0%, rgba(251,146,60,0.08) 35%, transparent 70%)"
            : "radial-gradient(ellipse at center, rgba(249,115,22,0.18) 0%, rgba(234,88,12,0.08) 35%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* ── Floating amber orb (left) ────────────────────────────────── */}
      <div
        className="absolute top-24 -left-32 w-[420px] h-[420px] rounded-full opacity-60 hero-orb-float"
        style={{
          background: isLight
            ? "radial-gradient(circle, rgba(251,191,36,0.22) 0%, transparent 65%)"
            : "radial-gradient(circle, rgba(251,191,36,0.18) 0%, transparent 65%)",
          filter: "blur(60px)",
        }}
      />

      {/* ── Floating orange orb (right) ──────────────────────────────── */}
      <div
        className="absolute top-40 -right-40 w-[480px] h-[480px] rounded-full opacity-60 hero-orb-float-delayed"
        style={{
          background: isLight
            ? "radial-gradient(circle, rgba(234,88,12,0.20) 0%, transparent 65%)"
            : "radial-gradient(circle, rgba(234,88,12,0.22) 0%, transparent 65%)",
          filter: "blur(70px)",
        }}
      />

      {/* ── Subtle grid pattern (faded by mask) ──────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: isLight
            ? `linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px),
               linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px)`
            : `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
               linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      {/* ── Glow line at bottom ──────────────────────────────────────── */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-px"
        style={{
          background: isLight
            ? "linear-gradient(90deg, transparent, rgba(234,88,12,0.35), transparent)"
            : "linear-gradient(90deg, transparent, rgba(249,115,22,0.4), transparent)",
        }}
      />
    </div>
  );
}
