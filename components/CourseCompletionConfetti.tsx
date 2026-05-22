"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";

interface Props {
  show: boolean;
  onDone: () => void;
}

export default function CourseCompletionConfetti({ show, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<confetti.CreateTypes | null>(null);

  useEffect(() => {
    if (!show || !canvasRef.current) return;

    instanceRef.current = confetti.create(canvasRef.current, {
      resize: true,
      useWorker: true,
    });

    const fire = instanceRef.current;

    // Initial multi-angle burst
    const burst = (ratio: number, opts: confetti.Options) =>
      fire({ origin: { y: 0.62 }, ...opts, particleCount: Math.floor(230 * ratio) });

    burst(0.25, { spread: 26, startVelocity: 60 });
    burst(0.20, { spread: 68 });
    burst(0.35, { spread: 105, decay: 0.91, scalar: 0.8 });
    burst(0.10, { spread: 125, startVelocity: 28, decay: 0.92, scalar: 1.3 });
    burst(0.10, { spread: 135, startVelocity: 52 });

    // Side cannons
    fire({ particleCount: 60, angle: 60,  spread: 55, origin: { x: 0,    y: 0.65 }, startVelocity: 55 });
    fire({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1,    y: 0.65 }, startVelocity: 55 });

    // Gentle shower for 4 s, then notify parent
    const endAt = Date.now() + 4200;
    const interval = setInterval(() => {
      const left = endAt - Date.now();
      if (left <= 0) {
        clearInterval(interval);
        instanceRef.current?.reset();
        onDone();
        return;
      }
      fire({
        particleCount: Math.ceil(40 * (left / 4200)),
        origin: { x: Math.random(), y: Math.random() * 0.45 },
      });
    }, 230);

    return () => {
      clearInterval(interval);
      instanceRef.current?.reset();
    };
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 pointer-events-none z-[9999]"
        >
          <canvas ref={canvasRef} className="w-full h-full" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
