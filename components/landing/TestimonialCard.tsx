"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import Avatar from "@/components/Avatar";

interface Props {
  name: string;
  role: string;
  comment: string;
  rating: number;
  avatar: string;
  delay?: number;
}

export default function TestimonialCard({ name, role, comment, rating, delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
      className="backdrop-blur-lg bg-secondary/20 border border-border rounded-lg p-6 hover:bg-secondary/30 hover:border-primary/30 transition-all duration-300 group"
    >
      <Quote className="w-8 h-8 text-[#d97757]/30 mb-4" />
      <p className="text-muted-foreground text-sm leading-relaxed mb-6">{comment}</p>
      <div className="flex items-center gap-1 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${
              i < rating ? "text-yellow-400 fill-yellow-400" : "text-white/20"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Avatar name={name} seed={name} size="w-10 h-10" className="flex-shrink-0" />
        <div>
          <p className="text-white font-medium text-sm">{name}</p>
          <p className="text-muted-foreground/70 text-xs">{role}</p>
        </div>
      </div>
    </motion.div>
  );
}
