"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  words: string[];
  className?: string;
  interval?: number;
}

export default function RotatingWords({ words, className = "", interval = 2800 }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, interval);
    return () => clearInterval(timer);
  }, [words.length, interval]);

  return (
    <span className={`relative inline-flex overflow-hidden ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          initial={{ y: 30, opacity: 0, rotateX: -40 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          exit={{ y: -30, opacity: 0, rotateX: 40 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="inline-block bg-gradient-to-r from-[#c2410c] via-[#ea580c] to-[#fb923c] bg-clip-text text-transparent"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
