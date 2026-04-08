"use client";

/**
 * Wraps children with Stripe Elements provider.
 * Apply this around any component that needs useStripe() or useElements().
 */
import { useState, useEffect } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
);

const APPEARANCE_DARK = {
  theme:     "night" as const,
  variables: {
    colorPrimary:    "#d4703f",
    colorBackground: "#0d0d0d",
    colorText:       "#e2e8f0",
    colorDanger:     "#ef4444",
    fontFamily:      "system-ui, sans-serif",
    borderRadius:    "8px",
    spacingUnit:     "4px",
  },
  rules: {
    ".Input": { backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" },
    ".Input:focus": { border: "1px solid #d4703f", boxShadow: "0 0 0 2px rgba(212,112,63,0.15)" },
  },
};

const APPEARANCE_LIGHT = {
  theme:     "flat" as const,
  variables: {
    colorPrimary:    "#d4703f",
    colorBackground: "#fdf9f5",
    colorText:       "#1c1411",
    colorDanger:     "#ef4444",
    fontFamily:      "system-ui, sans-serif",
    borderRadius:    "8px",
    spacingUnit:     "4px",
  },
  rules: {
    ".Input": { backgroundColor: "#f0ece6", border: "1px solid #ddd5c9" },
    ".Input:focus": { border: "1px solid #d4703f", boxShadow: "0 0 0 2px rgba(212,112,63,0.15)" },
  },
};

type Appearance = typeof APPEARANCE_DARK | typeof APPEARANCE_LIGHT;

export function StripeProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>(APPEARANCE_DARK);

  useEffect(() => {
    const update = () => {
      const isLight = document.documentElement.classList.contains("light");
      setAppearance(isLight ? APPEARANCE_LIGHT : APPEARANCE_DARK);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <Elements stripe={stripePromise} options={{ appearance }}>
      {children}
    </Elements>
  );
}
