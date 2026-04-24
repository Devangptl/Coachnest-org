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
    </div>
  );
}
