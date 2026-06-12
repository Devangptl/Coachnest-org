"use client";

/**
 * Organization registration wizard:
 *   1. Organization details (name, slug, email, phone)
 *   2. Plan + billing cycle
 *   3. Admin account (new credentials)
 *   4. Razorpay payment → org activates → redirect to the org admin portal
 */
import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2, Check, ChevronRight, Loader2, AlertCircle, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import RazorpayCustomForm, {
  type RazorpayOrderInfo,
} from "@/components/checkout/RazorpayCustomForm";
import type { RazorpaySuccessResponse } from "@/types/razorpay";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  maxStudents: number | null;
  maxInstructors: number | null;
  maxCourses: number | null;
  features: string[] | null;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

export default function OrgRegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1 — org details
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [slugReason, setSlugReason] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPhone, setOrgPhone] = useState("");

  // Step 2 — plan
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState("");
  const [cycle, setCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");

  // Step 3 — admin account
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // Step 4 — payment
  const [orderInfo, setOrderInfo] = useState<RazorpayOrderInfo | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [orgSlugFinal, setOrgSlugFinal] = useState("");

  useEffect(() => {
    fetch("/api/org/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []))
      .catch(() => setError("Failed to load plans. Please refresh."));
  }, []);

  useEffect(() => {
    if (!slug || slug.length < 3) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    const t = setTimeout(() => {
      fetch(`/api/org/check-slug?slug=${encodeURIComponent(slug)}`)
        .then((r) => r.json())
        .then((d) => {
          setSlugStatus(d.available ? "available" : "taken");
          setSlugReason(d.reason ?? "");
        })
        .catch(() => setSlugStatus("idle"));
    }, 400);
    return () => clearTimeout(t);
  }, [slug]);

  const selectedPlan = plans.find((p) => p.id === planId);
  const price = selectedPlan
    ? cycle === "YEARLY" ? selectedPlan.priceYearly : selectedPlan.priceMonthly
    : 0;

  function next(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (step === 1) {
      if (!orgName || !slug || !orgEmail) return setError("Please fill in all required fields.");
      if (slugStatus === "taken") return setError(slugReason || "This URL is already taken.");
      setStep(2);
    } else if (step === 2) {
      if (!planId) return setError("Please choose a plan.");
      setStep(3);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!adminName || !adminEmail || adminPassword.length < 6) {
      return setError("Admin name, email, and a password of at least 6 characters are required.");
    }
    setLoading(true);
    try {
      const res = await fetch("/api/org/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: orgName,
          slug,
          email: orgEmail,
          phone: orgPhone || null,
          planId,
          billingCycle: cycle,
          admin: { name: adminName, email: adminEmail, password: adminPassword, useCurrentUser: false },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        return;
      }
      setTransactionId(data.transactionId);
      setOrgSlugFinal(data.orgSlug);
      setOrderInfo({
        razorpayOrderId: data.razorpayOrderId,
        dbOrderId: data.transactionId,
        amount: data.amount,
        currency: data.currency,
        key: data.razorpayKeyId,
        type: "org",
      });
      setStep(4);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePaymentSuccess(response: RazorpaySuccessResponse) {
    const res = await fetch("/api/org/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionId,
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Payment verification failed");
    }
    router.push(`/org/${orgSlugFinal}/login?registered=1`);
  }

  const steps = ["Organization", "Plan", "Admin account", "Payment"];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-12">
      <Link href="/" className="mb-8">
        <img src="/logo.png" alt="Coachnest" className="h-7 w-auto object-contain" />
      </Link>

      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-orange-500/10 mb-4">
            <Building2 className="w-6 h-6 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Register your organization</h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            Get a private learning workspace for your team.
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
                  step === i + 1
                    ? "bg-orange-500/15 text-orange-500"
                    : step > i + 1
                      ? "bg-green-500/10 text-green-500"
                      : "bg-secondary text-muted-foreground",
                )}
              >
                {step > i + 1 ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-6 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
          {step === 1 && (
            <form onSubmit={next} className="space-y-4">
              <div>
                <label className="label" htmlFor="orgName">Organization name *</label>
                <input
                  id="orgName" type="text" className="input-glass" placeholder="ABC Company"
                  value={orgName}
                  onChange={(e) => {
                    setOrgName(e.target.value);
                    if (!slugTouched) setSlug(slugify(e.target.value));
                  }}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="slug">Workspace URL *</label>
                <div className="flex items-center gap-0">
                  <span className="text-sm text-muted-foreground bg-secondary border border-r-0 border-border rounded-l-lg px-3 py-2.5 whitespace-nowrap">
                    /org/
                  </span>
                  <input
                    id="slug" type="text" className="input-glass !rounded-l-none flex-1" placeholder="abc-company"
                    value={slug}
                    onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }}
                    required
                  />
                </div>
                {slug.length >= 3 && (
                  <p
                    className={cn(
                      "text-xs mt-1.5",
                      slugStatus === "available" && "text-green-500",
                      slugStatus === "taken" && "text-red-400",
                      slugStatus === "checking" && "text-muted-foreground",
                    )}
                  >
                    {slugStatus === "checking" && "Checking availability…"}
                    {slugStatus === "available" && `Your workspace will live at /org/${slug}`}
                    {slugStatus === "taken" && (slugReason || "This URL is already taken.")}
                  </p>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="orgEmail">Organization email *</label>
                  <input
                    id="orgEmail" type="email" className="input-glass" placeholder="billing@abc.com"
                    value={orgEmail} onChange={(e) => setOrgEmail(e.target.value)} required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="orgPhone">Phone</label>
                  <input
                    id="orgPhone" type="tel" className="input-glass" placeholder="+91 98765 43210"
                    value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full mt-2">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={next} className="space-y-5">
              <div className="flex items-center justify-center gap-1 bg-secondary rounded-lg p-1 w-fit mx-auto">
                {(["MONTHLY", "YEARLY"] as const).map((c) => (
                  <button
                    key={c} type="button" onClick={() => setCycle(c)}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-xs font-medium transition-colors",
                      cycle === c ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                    )}
                  >
                    {c === "MONTHLY" ? "Monthly" : "Yearly"}
                  </button>
                ))}
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {plans.map((p) => {
                  const amount = cycle === "YEARLY" ? p.priceYearly : p.priceMonthly;
                  return (
                    <button
                      key={p.id} type="button" onClick={() => setPlanId(p.id)}
                      className={cn(
                        "text-left border rounded-xl p-4 transition-colors",
                        planId === p.id
                          ? "border-orange-500 bg-orange-500/5"
                          : "border-border hover:border-orange-500/40",
                      )}
                    >
                      <p className="font-semibold text-foreground text-sm">{p.name}</p>
                      <p className="text-xl font-bold text-foreground mt-1">
                        ₹{amount.toLocaleString("en-IN")}
                        <span className="text-xs font-normal text-muted-foreground">
                          /{cycle === "YEARLY" ? "yr" : "mo"}
                        </span>
                      </p>
                      <ul className="mt-3 space-y-1.5">
                        {(p.features ?? []).slice(0, 4).map((f) => (
                          <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleRegister} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This account becomes the first <strong className="text-foreground">Organization Admin</strong> for {orgName}.
              </p>
              <div>
                <label className="label" htmlFor="adminName">Full name *</label>
                <input
                  id="adminName" type="text" className="input-glass" placeholder="Jane Doe"
                  value={adminName} onChange={(e) => setAdminName(e.target.value)} required
                />
              </div>
              <div>
                <label className="label" htmlFor="adminEmail">Email *</label>
                <input
                  id="adminEmail" type="email" className="input-glass" placeholder="jane@abc.com"
                  value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required
                />
              </div>
              <div>
                <label className="label" htmlFor="adminPassword">Password *</label>
                <input
                  id="adminPassword" type="password" className="input-glass" placeholder="••••••••"
                  value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)}
                  required minLength={6} autoComplete="new-password"
                />
              </div>

              {selectedPlan && (
                <div className="bg-secondary/50 border border-border rounded-lg px-4 py-3 text-sm flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {selectedPlan.name} · {cycle === "YEARLY" ? "Yearly" : "Monthly"}
                  </span>
                  <span className="font-semibold text-foreground">₹{price.toLocaleString("en-IN")}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1" disabled={loading}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={loading}>
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                    : <>Proceed to Payment <ChevronRight className="w-4 h-4" /></>}
                </button>
              </div>
            </form>
          )}

          {step === 4 && orderInfo && (
            <RazorpayCustomForm
              orderInfo={orderInfo}
              description={`${orgName} — ${selectedPlan?.name ?? ""} (${cycle === "YEARLY" ? "Yearly" : "Monthly"})`}
              prefillEmail={adminEmail}
              onSuccess={handlePaymentSuccess}
              onError={(msg) => setError(msg)}
              onBack={() => setStep(3)}
            />
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already registered?{" "}
          <Link href="/login" className="text-orange-500 hover:text-[#d97757] font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
