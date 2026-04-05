"use client";

/**
 * Wraps children with Stripe Elements provider.
 * Apply this around any component that needs useStripe() or useElements().
 */
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
);

const APPEARANCE = {
  theme:     "night" as const,
  variables: {
    colorPrimary:    "#f97316",
    colorBackground: "#0f0f1a",
    colorText:       "#e2e8f0",
    colorDanger:     "#f87171",
    fontFamily:      "system-ui, sans-serif",
    borderRadius:    "8px",
    spacingUnit:     "4px",
  },
  rules: {
    ".Input": {
      backgroundColor: "rgba(255,255,255,0.04)",
      border:          "1px solid rgba(255,255,255,0.1)",
    },
    ".Input:focus": {
      border:    "1px solid #f97316",
      boxShadow: "0 0 0 2px rgba(249,115,22,0.15)",
    },
  },
};

export function StripeProvider({ children }: { children: React.ReactNode }) {
  return (
    <Elements stripe={stripePromise} options={{ appearance: APPEARANCE }}>
      {children}
    </Elements>
  );
}
