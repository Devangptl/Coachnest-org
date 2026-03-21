"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export default function HeroBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 50, y: 50 });

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

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-auto">
      {/* ── Mouse-tracking spotlight ─────────────────────────────────── */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full transition-all duration-700 ease-out opacity-30"
        style={{
          left: `${mouse.x}%`,
          top: `${mouse.y}%`,
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
        }}
      />

      {/* ── Perspective grid ─────────────────────────────────────────── */}
      <div className="absolute inset-0 hero-grid opacity-[0.04]" />

      {/* ── Orbiting rings ───────────────────────────────────────────── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {/* Ring 1 — large, slow */}
        <motion.div
          className="absolute -top-[280px] -left-[280px] w-[560px] h-[560px] rounded-full border border-white/[0.04]"
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-purple-400/40 shadow-[0_0_12px_rgba(168,85,247,0.4)]" />
        </motion.div>

        {/* Ring 2 — medium, counter */}
        <motion.div
          className="absolute -top-[200px] -left-[200px] w-[400px] h-[400px] rounded-full border border-white/[0.06]"
          animate={{ rotate: -360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full bg-violet-400/50 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
          <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-pink-400/40 shadow-[0_0_8px_rgba(244,114,182,0.4)]" />
        </motion.div>

        {/* Ring 3 — small, fast */}
        <motion.div
          className="absolute -top-[120px] -left-[120px] w-[240px] h-[240px] rounded-full border border-purple-400/[0.08]"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400/50 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
        </motion.div>

        {/* Center glow pulse */}
        <motion.div
          className="absolute -top-[60px] -left-[60px] w-[120px] h-[120px] rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background: "radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ── Floating glow orbs ───────────────────────────────────────── */}
      <motion.div
        className="absolute top-[15%] left-[10%] w-80 h-80 rounded-full"
        animate={{ y: [0, -25, 0], x: [0, 10, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)" }}
      />
      <motion.div
        className="absolute bottom-[10%] right-[8%] w-96 h-96 rounded-full"
        animate={{ y: [0, 20, 0], x: [0, -15, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        style={{ background: "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)" }}
      />
      <motion.div
        className="absolute top-[40%] right-[20%] w-64 h-64 rounded-full"
        animate={{ y: [0, 15, 0], x: [0, -8, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        style={{ background: "radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)" }}
      />

      {/* ── Star particles ───────────────────────────────────────────── */}
      {STARS.map((s) => (
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
        <div className="w-20 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent -rotate-[25deg]" />
      </motion.div>
    </div>
  );
}

// Pre-compute star particles to avoid re-creating on every render
const STARS = Array.from({ length: 35 }, (_, i) => ({
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
