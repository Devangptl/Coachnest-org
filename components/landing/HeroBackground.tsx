"use client";

import { useTheme } from "@/components/ThemeProvider";

/**
 * Hero background — faint base grid plus small glow segments that travel
 * independently along random horizontal and vertical grid lines (up,
 * down, left, right). Subtle by design — minimum highlight.
 */
export default function HeroBackground() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  const baseLine = isLight ? "rgba(15, 23, 42, 0.03)" : "rgba(255, 255, 255, 0.03)";
  const gridSize = "56px 56px";

  /* Each entry sits on a specific grid line.
     `axis: "v"` rides a vertical line; `axis: "h"` rides a horizontal line.
     `dir: 1` travels down/right; `dir: -1` travels up/left. */
  const beams: Array<{
    axis: "v" | "h";
    dir: 1 | -1;
    track: number;     // grid-cell index from top/left
    duration: number;  // seconds for one full pass
    delay: number;     // seconds before first run
  }> = [
      { axis: "v", dir: 1, track: 4, duration: 6.5, delay: 0 },
      { axis: "v", dir: -1, track: 9, duration: 8, delay: 1.4 },
      { axis: "v", dir: 1, track: 15, duration: 7, delay: 3 },
      { axis: "v", dir: -1, track: 21, duration: 9, delay: 0.8 },
      { axis: "h", dir: 1, track: 3, duration: 7.5, delay: 0.4 },
      { axis: "h", dir: -1, track: 6, duration: 8.5, delay: 2.2 },
      { axis: "h", dir: 1, track: 9, duration: 6.8, delay: 4 },
    ];

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

      {/* ── Glow beams traveling on individual grid lines ──────────── */}
      {beams.map((b, i) => {
        const isV = b.axis === "v";
        const animName = isV
          ? b.dir === 1 ? "hero-beam-down" : "hero-beam-up"
          : b.dir === 1 ? "hero-beam-right" : "hero-beam-left";

        const positionStyle: React.CSSProperties = isV
          ? { left: `calc(56px * ${b.track})`, top: 0, bottom: 0, width: "1.5px" }
          : { top: `calc(56px * ${b.track})`, left: 0, right: 0, height: "1.5px" };

        return (
          <div
            key={i}
            className="absolute"
            style={positionStyle}
          >
            <span
              className="hero-beam"
              style={{
                animationName: animName,
                animationDuration: `${b.duration}s`,
                animationDelay: `${b.delay}s`,
                ...(isV
                  ? { width: "1.5px", height: "70px" }
                  : { height: "1.5px", width: "70px" }),
                background: isV
                  ? "linear-gradient(to bottom, transparent, rgba(249,115,22,0.55), transparent)"
                  : "linear-gradient(to right, transparent, rgba(249,115,22,0.55), transparent)",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
