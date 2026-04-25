"use client";

import { useTheme } from "@/components/ThemeProvider";

/**
 * Hero background — animated grid lines that subtly drift and a faint
 * radial mask. No coloured glow orbs.
 */
export default function HeroBackground() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const lineColor = isLight ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.06)";
  const accentColor = isLight ? "rgba(234,88,12,0.55)" : "rgba(249,115,22,0.55)";

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">

      {/* ── Drifting grid (animated) ─────────────────────────────────── */}
      <div
        className="absolute inset-0 hero-grid-drift"
        style={{
          backgroundImage: `
            linear-gradient(${lineColor} 1px, transparent 1px),
            linear-gradient(90deg, ${lineColor} 1px, transparent 1px)
          `,
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center, black 25%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 25%, transparent 80%)",
        }}
      />

      {/* ── Sweeping accent line — horizontal ────────────────────────── */}
      <div
        className="absolute left-0 right-0 top-1/3 h-px hero-line-sweep"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
        }}
      />

      {/* ── Sweeping accent line — vertical ──────────────────────────── */}
      <div
        className="absolute top-0 bottom-0 left-1/2 w-px hero-line-sweep-v"
        style={{
          background: `linear-gradient(180deg, transparent, ${accentColor}, transparent)`,
        }}
      />

      {/* ── Bottom border line ───────────────────────────────────────── */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
        }}
      />
    </div>
  );
}
