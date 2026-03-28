/**
 * /pricing — Subscription plans page.
 */
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import PricingCard, { type PricingPlan } from "@/components/PricingCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Zap, Shield, HelpCircle } from "lucide-react";
import toast from "react-hot-toast";

const PLANS: Record<"monthly" | "yearly", PricingPlan[]> = {
  monthly: [
    {
      id: "free", name: "Free", price: 0, period: "month",
      cta: "Get Started",
      features: [
        "Access to free courses",
        "Community forum",
        "Course previews",
        "Basic progress tracking",
      ],
    },
    {
      id: "basic", name: "Basic", price: 499, period: "month",
      cta: "Start Basic", popular: false,
      features: [
        "Everything in Free",
        "Up to 5 paid courses",
        "Download certificates",
        "Priority support",
        "Mobile app access",
      ],
    },
    {
      id: "pro", name: "Pro", price: 999, period: "month",
      cta: "Go Pro", popular: true,
      features: [
        "Everything in Basic",
        "Unlimited courses",
        "Offline downloads",
        "AI recommendations",
        "Instructor Q&A",
        "Early access to new courses",
      ],
    },
    {
      id: "enterprise", name: "Enterprise", price: 4999, period: "month",
      cta: "Contact Sales", badge: "For Teams",
      features: [
        "Everything in Pro",
        "Team management (up to 50)",
        "Custom org branding",
        "Analytics dashboard",
        "Dedicated account manager",
        "SSO / SAML support",
      ],
    },
  ],
  yearly: [
    {
      id: "free", name: "Free", price: 0, period: "year",
      cta: "Get Started",
      features: [
        "Access to free courses",
        "Community forum",
        "Course previews",
        "Basic progress tracking",
      ],
    },
    {
      id: "basic", name: "Basic", price: 3999, period: "year",
      cta: "Start Basic",
      features: [
        "Everything in Free",
        "Up to 5 paid courses",
        "Download certificates",
        "Priority support",
        "Mobile app access",
      ],
    },
    {
      id: "pro", name: "Pro", price: 7999, period: "year",
      cta: "Go Pro", popular: true,
      features: [
        "Everything in Basic",
        "Unlimited courses",
        "Offline downloads",
        "AI recommendations",
        "Instructor Q&A",
        "Early access to new courses",
      ],
    },
    {
      id: "enterprise", name: "Enterprise", price: 39999, period: "year",
      cta: "Contact Sales", badge: "Best Value",
      features: [
        "Everything in Pro",
        "Team management (up to 50)",
        "Custom org branding",
        "Analytics dashboard",
        "Dedicated account manager",
        "SSO / SAML support",
      ],
    },
  ],
};

const FAQ = [
  { q: "Can I switch plans?",            a: "Yes, upgrade or downgrade at any time. Changes take effect at the next billing cycle." },
  { q: "Is there a free trial?",         a: "Pro plan comes with a 7-day free trial. No credit card required." },
  { q: "How do refunds work?",           a: "We offer a 30-day money-back guarantee on all paid plans." },
  { q: "What payment methods do you accept?", a: "We accept all major cards, UPI, and net banking via Stripe." },
];

export default function PricingPage() {
  const [billing, setBilling]   = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading]   = useState<string | null>(null);
  const router = useRouter();

  async function handleSelect(plan: PricingPlan) {
    if (plan.id === "free") {
      router.push("/signup");
      return;
    }
    if (plan.id === "enterprise") {
      toast.success("Our sales team will reach out within 24 hours.");
      return;
    }

    setLoading(plan.id);
    try {
      const res = await fetch("/api/subscriptions/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ plan: plan.id, billing }),
      });

      const data = await res.json();

      if (!res.ok) {
        // If user is not logged in, redirect to login
        if (res.status === 401) {
          router.push(`/login?from=/pricing`);
          return;
        }
        throw new Error(data.error ?? "Something went wrong");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to start checkout";
      toast.error(message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 badge-purple mb-4">
          <Zap className="w-3.5 h-3.5" /> Simple, transparent pricing
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
          Invest in your future
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Choose a plan that works for you. All plans include access to our
          growing library of world-class courses.
        </p>
      </motion.div>

      {/* Billing toggle */}
      <div className="flex justify-center mb-10">
        <Tabs value={billing} onValueChange={(v) => setBilling(v as "monthly" | "yearly")}>
          <TabsList className="w-auto">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">
              Yearly
              <span className="badge-green ml-1 text-[10px]">Save 33%</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
        {PLANS[billing].map((plan, i) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            index={i}
            onSelect={handleSelect}
            loading={loading === plan.id}
          />
        ))}
      </div>

      {/* Trust badges */}
      <div className="flex flex-wrap justify-center gap-8 mb-20 text-muted-foreground/70 text-sm">
        {[
          { icon: Shield, label: "30-day money-back guarantee" },
          { icon: Zap,    label: "Instant access after payment" },
          { icon: Shield, label: "Secure payments via Stripe" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-orange-400" />
            {label}
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-white text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="glass p-5">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium mb-1">{q}</p>
                  <p className="text-muted-foreground text-sm">{a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
