"use client";

import { useTheme } from "@/components/ThemeProvider";

/**
 * Hero background — base faint grid + a moving diagonal "light beam"
 * masked over a brighter copy of the same grid. The result: a glow that
 * appears to travel along the grid lines themselves.
 */
export default function HeroBackground() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const baseLine = isLight ? "rgba(15,23,42,0.07)" : "rgba(255,255,255,0.06)";
  const glowLine = isLight ? "rgba(234,88,12,0.85)" : "rgba(249,115,22,0.85)";

  const gridSize = "56px 56px";

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">

      {/* ── Base faint grid ─────────────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(${baseLine} 1px, transparent 1px),
            linear-gradient(90deg, ${baseLine} 1px, transparent 1px)
          `,
          backgroundSize: gridSize,
          maskImage:
            "radial-gradient(ellipse at center, black 25%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 25%, transparent 80%)",
        }}
      />

      {/* ── Glow grid: bright lines, masked by traveling diagonal beam ── */}
      <div
        className="absolute inset-0 hero-grid-glow"
        style={{
          backgroundImage: `
            linear-gradient(${glowLine} 1px, transparent 1px),
            linear-gradient(90deg, ${glowLine} 1px, transparent 1px)
          `,
          backgroundSize: gridSize,
          filter: "blur(0.5px) drop-shadow(0 0 6px rgba(249,115,22,0.55))",
        }}
      />
    </div>
  );
}
