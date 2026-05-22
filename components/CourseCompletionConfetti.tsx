"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Award, X, Sparkles, Trophy } from "lucide-react";

interface Props {
  show: boolean;
  onClose: () => void;
}

export default function CourseCompletionConfetti({ show, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<confetti.CreateTypes | null>(null);

  useEffect(() => {
    if (!show || !canvasRef.current) return;

    instanceRef.current = confetti.create(canvasRef.current, {
      resize: true,
      useWorker: true,
    });

    const fire = (instanceRef.current as confetti.CreateTypes);

    // Initial big burst from center-bottom
    const burst = (ratio: number, opts: confetti.Options) =>
      fire({ origin: { y: 0.75 }, ...opts, particleCount: Math.floor(220 * ratio) });

    burst(0.25, { spread: 26, startVelocity: 60 });
    burst(0.20, { spread: 65 });
    burst(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    burst(0.10, { spread: 120, startVelocity: 28, decay: 0.92, scalar: 1.3 });
    burst(0.10, { spread: 130, startVelocity: 50 });

    // Continuous shower for 4 seconds
    const endAt = Date.now() + 4000;
    const interval = setInterval(() => {
      const timeLeft = endAt - Date.now();
      if (timeLeft <= 0) { clearInterval(interval); return; }
      const count = 45 * (timeLeft / 4000);
      fire({ particleCount: count, origin: { x: Math.random(), y: Math.random() * 0.4 } });
    }, 220);

    return () => {
      clearInterval(interval);
      instanceRef.current?.reset();
    };
  }, [show]);

  // Close on Escape
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
        >
          {/* Full-screen confetti canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Celebration card */}
          <motion.div
            initial={{ scale: 0.75, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 15 }}
            transition={{ type: "spring", stiffness: 320, damping: 26, delay: 0.05 }}
            className="relative z-10 bg-background border border-border rounded-2xl p-8 sm:p-10 max-w-sm w-full mx-4 text-center shadow-2xl"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Trophy icon with wiggle */}
            <motion.div
              animate={{ rotate: [0, -12, 12, -7, 7, -3, 3, 0] }}
              transition={{ duration: 0.7, delay: 0.3, ease: "easeInOut" }}
              className="w-24 h-24 bg-gradient-to-br from-amber-500/25 to-yellow-500/15 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-400/20"
            >
              <Trophy className="w-12 h-12 text-amber-400" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.35 }}
            >
              {/* Label */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">
                  Course Complete
                </span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </div>

              {/* Headline */}
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-3 leading-tight">
                Congratulations!
              </h2>
              <p className="text-muted-foreground/65 text-sm leading-relaxed mb-7">
                You&apos;ve finished every lesson in this course.
                Your certificate is ready to download below.
              </p>

              {/* CTA */}
              <button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold py-3 px-6 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
              >
                <Award className="w-4 h-4" />
                Get My Certificate
              </button>

              <button
                onClick={onClose}
                className="mt-3 w-full text-muted-foreground/50 hover:text-muted-foreground text-xs py-2 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
