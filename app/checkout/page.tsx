/**
 * /checkout?plan=PRO&billing=monthly
 * Subscription checkout page — subscription plans have been removed.
 * Redirects users to the direct course/feature purchase pages instead.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import CheckoutClient from "./CheckoutClient";

const PLANS = {
  BASIC: {
    label:        "Basic",
    monthlyPrice: 499,
    yearlyPrice:  3999,
    color:        "text-blue-500",
    bg:           "bg-blue-500/10",
    border:       "border-blue-500/20",
    features: [
      "Paid courses (up to 5)",
      "Download certificates",
      "Priority support",
      "Mobile app access",
    ],
  },
  PRO: {
    label:        "Pro",
    monthlyPrice: 999,
    yearlyPrice:  7999,
    popular:      true,
    color:        "text-primary",
    bg:           "bg-primary/10",
    border:       "border-primary/20",
    features: [
      "Everything in Basic",
      "Unlimited courses",
      "Offline downloads",
      "AI recommendations",
      "Instructor Q&A",
      "Early access to new content",
    ],
  },
  ENTERPRISE: {
    label:        "Enterprise",
    monthlyPrice: 4999,
    yearlyPrice:  39999,
    color:        "text-purple-500",
    bg:           "bg-purple-500/10",
    border:       "border-purple-500/20",
    features: [
      "Everything in Pro",
      "Team management (50 seats)",
      "Custom org branding",
      "Dedicated account manager",
      "SSO / SAML",
    ],
  },
} as const;

type PlanKey = keyof typeof PLANS;

interface PageProps {
  searchParams: Promise<{ plan?: string; billing?: string }>;
}

export default async function CheckoutPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login?next=/checkout");

  const { plan: planParam, billing: billingParam } = await searchParams;

  const planKey = (planParam?.toUpperCase() ?? "PRO") as PlanKey;
  const billing = (billingParam === "yearly" ? "yearly" : "monthly") as "monthly" | "yearly";

  if (!PLANS[planKey]) redirect("/pricing");

  const plan = PLANS[planKey];
  const price = billing === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-16">
        <CheckoutClient
          planKey={planKey}
          planLabel={plan.label}
          billing={billing}
          price={price}
          features={plan.features as unknown as string[]}
          popular={"popular" in plan ? plan.popular : false}
          color={plan.color}
          bg={plan.bg}
          border={plan.border}
        />
      </main>
    </div>
  );
}
