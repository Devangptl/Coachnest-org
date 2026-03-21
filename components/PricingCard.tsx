"use client";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "./ui/Button";
import { cn } from "@/lib/utils";

export interface PricingPlan {
  id:       string;
  name:     string;
  price:    number;    // monthly INR; 0 = free
  period:   string;
  badge?:   string;
  popular?: boolean;
  features: string[];
  cta:      string;
}

interface Props {
  plan:     PricingPlan;
  index?:   number;
  onSelect: (plan: PricingPlan) => void;
}

export default function PricingCard({ plan, index = 0, onSelect }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "relative flex flex-col glass p-6 transition-all hover:scale-[1.02] duration-300",
        plan.popular && "border-purple-400/50 shadow-glow"
      )}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="badge-purple text-xs px-3 py-1 shadow-md">Most Popular</span>
        </div>
      )}
      {plan.badge && !plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="badge-amber text-xs px-3 py-1">{plan.badge}</span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-white font-bold text-xl mb-1">{plan.name}</h3>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-black text-white">
            {plan.price === 0 ? "Free" : `₹${plan.price.toLocaleString("en-IN")}`}
          </span>
          {plan.price > 0 && (
            <span className="text-white/40 text-sm mb-1">/{plan.period}</span>
          )}
        </div>
      </div>

      <ul className="flex-1 space-y-3 mb-6">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
            <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      <Button
        variant={plan.popular ? "primary" : "secondary"}
        className="w-full"
        onClick={() => onSelect(plan)}
      >
        {plan.cta}
      </Button>
    </motion.div>
  );
}
