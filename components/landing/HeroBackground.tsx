"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

export default function HeroBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 50, y: 50 });
  const { theme } = useTheme();
  const isLight = theme === "light";

  useEffect(() => {
    function handleMove(e: MouseEvent) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMouse({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    }
    const el = containerRef.current;
    el?.addEventListener("mousemove", handleMove);
    return () => el?.removeEventListener("mousemove", handleMove);
  }, []);

  // ── Theme-aware colours ──────────────────────────────────────────────────
  const spotlight = isLight
    ? "radial-gradient(circle, rgba(204,85,8,0.07) 0%, transparent 70%)"
    : "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)";

  const ring1Border = isLight ? "rgba(24,19,16,0.07)" : "rgba(255,255,255,0.04)";
  const ring2Border = isLight ? "rgba(24,19,16,0.09)" : "rgba(255,255,255,0.06)";

  const orb1Bg  = isLight
    ? "radial-gradient(circle, rgba(204,85,8,0.08) 0%, transparent 70%)"
    : "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)";
  const orb2Bg  = isLight
    ? "radial-gradient(circle, rgba(146,64,14,0.06) 0%, transparent 70%)"
    : "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)";
  const orb3Bg  = isLight
    ? "radial-gradient(circle, rgba(204,85,8,0.04) 0%, transparent 70%)"
    : "radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)";

  const centerGlow = isLight
    ? "radial-gradient(circle, rgba(204,85,8,0.15) 0%, transparent 70%)"
    : "radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)";

  // Ring decoration dots
  const dot1Class = isLight ? "bg-orange-400/20" : "bg-orange-500/15";
  const dot1Shadow = isLight
    ? "0 0 10px rgba(204,85,8,0.25)"
    : "0 0 12px rgba(168,85,247,0.4)";
  const dot2Class = isLight ? "bg-amber-500/20" : "bg-orange-500/15";
  const dot2Shadow = isLight
    ? "0 0 8px rgba(146,64,14,0.25)"
    : "0 0 10px rgba(139,92,246,0.5)";
  const dot3Class = isLight ? "bg-orange-300/25" : "bg-pink-400/40";
  const dot3Shadow = isLight
    ? "0 0 6px rgba(204,85,8,0.20)"
    : "0 0 8px rgba(244,114,182,0.4)";
  const dot4Class = isLight ? "bg-amber-400/30" : "bg-cyan-400/50";
  const dot4Shadow = isLight
    ? "0 0 6px rgba(146,64,14,0.20)"
    : "0 0 8px rgba(34,211,238,0.5)";

  const shootingStarColor = isLight
    ? "from-transparent via-amber-800/30 to-transparent"
    : "from-transparent via-white/60 to-transparent";

  const stars = isLight ? STARS_LIGHT : STARS_DARK;

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-auto">
      {/* ── Mouse-tracking spotlight ─────────────────────────────────── */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full transition-all duration-700 ease-out opacity-30"
        style={{
          left: `${mouse.x}%`,
          top: `${mouse.y}%`,
          transform: "translate(-50%, -50%)",
          background: spotlight,
        }}
      />

      {/* ── Perspective grid ─────────────────────────────────────────── */}
      <div className="absolute inset-0 hero-grid opacity-[0.04]" />

      {/* ── Orbiting rings ───────────────────────────────────────────── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {/* Ring 1 — large, slow */}
        <motion.div
          className="absolute -top-[280px] -left-[280px] w-[560px] h-[560px] rounded-full"
          style={{ border: `1px solid ${ring1Border}` }}
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        >
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${dot1Class}`}
            style={{ boxShadow: dot1Shadow }}
          />
        </motion.div>

        {/* Ring 2 — medium, counter */}
        <motion.div
          className="absolute -top-[200px] -left-[200px] w-[400px] h-[400px] rounded-full"
          style={{ border: `1px solid ${ring2Border}` }}
          animate={{ rotate: -360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          <div
            className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full ${dot2Class}`}
            style={{ boxShadow: dot2Shadow }}
          />
          <div
            className={`absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${dot3Class}`}
            style={{ boxShadow: dot3Shadow }}
          />
        </motion.div>

        {/* Ring 3 — small, fast */}
        <motion.div
          className="absolute -top-[120px] -left-[120px] w-[240px] h-[240px] rounded-full"
          style={{ border: `1px solid ${isLight ? "rgba(24,19,16,0.06)" : "rgba(255,255,255,0.05)"}` }}
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <div
            className={`absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${dot4Class}`}
            style={{ boxShadow: dot4Shadow }}
          />
        </motion.div>

        {/* Center glow pulse */}
        <motion.div
          className="absolute -top-[60px] -left-[60px] w-[120px] h-[120px] rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ background: centerGlow }}
        />
      </div>

      {/* ── Floating glow orbs ───────────────────────────────────────── */}
      <motion.div
        className="absolute top-[15%] left-[10%] w-80 h-80 rounded-full"
        animate={{ y: [0, -25, 0], x: [0, 10, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: orb1Bg }}
      />
      <motion.div
        className="absolute bottom-[10%] right-[8%] w-96 h-96 rounded-full"
        animate={{ y: [0, 20, 0], x: [0, -15, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        style={{ background: orb2Bg }}
      />
      <motion.div
        className="absolute top-[40%] right-[20%] w-64 h-64 rounded-full"
        animate={{ y: [0, 15, 0], x: [0, -8, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        style={{ background: orb3Bg }}
      />

      {/* ── Star / dot particles ──────────────────────────────────────── */}
      {stars.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full"
          style={{
            width: s.size,
            height: s.size,
            left: `${s.x}%`,
            top: `${s.y}%`,
            background: s.color,
            boxShadow: `0 0 ${s.glow}px ${s.color}`,
          }}
          animate={{
            opacity: [s.minOp, s.maxOp, s.minOp],
            scale: [1, s.pulse, 1],
          }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* ── Shooting star ────────────────────────────────────────────── */}
      <motion.div
        className="absolute w-px h-px"
        style={{ top: "20%", left: "-5%" }}
        animate={{
          x: ["0vw", "110vw"],
          y: ["0vh", "40vh"],
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          repeatDelay: 8,
          ease: "easeIn",
        }}
      >
        <div className={`w-20 h-px bg-gradient-to-r ${shootingStarColor} -rotate-[25deg]`} />
      </motion.div>
    </div>
  );
}

// ── Dark mode particles ──────────────────────────────────────────────────────
const STARS_DARK = Array.from({ length: 35 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() < 0.3 ? Math.random() * 3 + 2 : Math.random() * 2 + 1,
  color: ["rgba(168,85,247,0.6)", "rgba(139,92,246,0.5)", "rgba(255,255,255,0.4)", "rgba(34,211,238,0.4)", "rgba(244,114,182,0.4)"][Math.floor(Math.random() * 5)],
  glow: Math.random() * 6 + 3,
  duration: Math.random() * 4 + 3,
  delay: Math.random() * 5,
  minOp: 0.1 + Math.random() * 0.15,
  maxOp: 0.5 + Math.random() * 0.4,
  pulse: 1 + Math.random() * 0.5,
}));

// ── Light mode particles (warm dark dots) ────────────────────────────────────
const STARS_LIGHT = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() < 0.3 ? Math.random() * 2.5 + 1.5 : Math.random() * 1.5 + 0.8,
  color: ["rgba(204,85,8,0.30)", "rgba(146,64,14,0.25)", "rgba(24,19,16,0.18)", "rgba(249,115,22,0.22)", "rgba(180,83,9,0.20)"][Math.floor(Math.random() * 5)],
  glow: Math.random() * 3 + 1,
  duration: Math.random() * 4 + 3,
  delay: Math.random() * 5,
  minOp: 0.15 + Math.random() * 0.15,
  maxOp: 0.45 + Math.random() * 0.30,
  pulse: 1 + Math.random() * 0.4,
}));
