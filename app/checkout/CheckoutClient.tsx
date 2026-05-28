"use client";

import Link from "next/link";
import { BookOpen, Zap, Crown, Building2, ArrowLeft } from "lucide-react";

interface Props {
  planKey:   string;
  planLabel: string;
  billing:   "monthly" | "yearly";
  price:     number;
  features:  string[];
  popular:   boolean;
  color:     string;
  bg:        string;
  border:    string;
}

const PLAN_ICONS: Record<string, React.ElementType> = {
  BASIC:      Zap,
  PRO:        Crown,
  ENTERPRISE: Building2,
};

/**
 * Subscription checkout is no longer available.
 * The platform uses a direct-purchase model (courses, books, features).
 */
export default function CheckoutClient({ planKey, planLabel }: Props) {
  const Icon = PLAN_ICONS[planKey] ?? Zap;

  return (
    <div className="max-w-lg mx-auto text-center space-y-6 py-16">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {planLabel} Plan — No Longer Available
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Subscription plans have been removed. You can now purchase courses,
          books, and platform add-ons directly — pay once, access forever.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/courses"
          className="btn-primary px-6 py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <BookOpen className="w-4 h-4" /> Browse Courses
        </Link>
        <Link
          href="/dashboard"
          className="px-6 py-2.5 text-sm font-semibold rounded-lg border border-border text-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
