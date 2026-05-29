"use client";

/**
 * /instructor/payouts — payout requests + referral link management
 */
import { useEffect, useState, FormEvent, useRef } from "react";
import {
  Wallet, ArrowDownToLine, Plus, Copy, Check,
  Link2, Loader2, AlertCircle, Trash2, ExternalLink,
  Clock, CheckCircle2, XCircle, RefreshCw, Tag, Building2,
} from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PayoutRequest {
  id: string; amount: number; status: string;
  notes: string | null; adminNotes: string | null;
  requestedAt: string; processedAt: string | null;
}

interface ReferralLink {
  id: string; code: string; label: string | null;
  courseId: string | null; courseTitle: string | null;
  totalClicks: number; conversions: number;
  conversionRate: number; isActive: boolean;
  createdAt: string; url: string;
}

interface Course { id: string; title: string }

const STATUS_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  PENDING:   { label: "Pending",   icon: Clock,         color: "text-amber-400"  },
  APPROVED:  { label: "Approved",  icon: CheckCircle2,  color: "text-blue-400"   },
  REJECTED:  { label: "Rejected",  icon: XCircle,       color: "text-red-400"    },
  PROCESSED: { label: "Processed", icon: CheckCircle2,  color: "text-emerald-400"},
};

// ── Copy to clipboard helper ───────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={handleCopy}
      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
      title="Copy link">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PayoutsPage() {
  const [wallet,   setWallet]   = useState<{ balance: number; totalEarned: number; totalWithdrawn: number } | null>(null);
  const [payouts,  setPayouts]  = useState<PayoutRequest[]>([]);
  const [links,    setLinks]    = useState<ReferralLink[]>([]);
  const [courses,  setCourses]  = useState<Course[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<"payouts" | "referrals">("payouts");

  // Payout form
  const [amount,      setAmount]      = useState("");
  const [bankHolder,  setBankHolder]  = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankIfsc,    setBankIfsc]    = useState("");
  const [bankName,    setBankName]    = useState("");
  const [bankPan,     setBankPan]     = useState("");
  const [payNotes,    setPayNotes]    = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [payError,    setPayError]    = useState("");
  const [paySuccess,  setPaySuccess]  = useState("");

  // IFSC live validation
  const [ifscStatus,   setIfscStatus]   = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [ifscBranch,   setIfscBranch]   = useState("");
  const ifscTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Referral form
  const [refCourse,   setRefCourse]   = useState("");
  const [refLabel,    setRefLabel]    = useState("");
  const [creating,    setCreating]    = useState(false);
  const [refError,    setRefError]    = useState("");

  async function loadAll() {
    setLoading(true);
    try {
      const [walletRes, payoutsRes, linksRes, coursesRes] = await Promise.all([
        fetch("/api/instructor/wallet"),
        fetch("/api/instructor/payout-requests"),
        fetch("/api/instructor/referrals"),
        fetch("/api/instructor/courses"),
      ]);
      const [wD, pD, lD, cD] = await Promise.all([
        walletRes.json(), payoutsRes.json(), linksRes.json(), coursesRes.json(),
      ]);
      setWallet(wD.wallet);
      setPayouts(pD.requests ?? []);
      setLinks(lD.links ?? []);
      setCourses(cD.courses ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  // ── IFSC live validation (debounced 600 ms) ──────────────────────────────────
  useEffect(() => {
    const ifsc = bankIfsc.trim().toUpperCase();
    if (ifscTimer.current) clearTimeout(ifscTimer.current);

    if (ifsc.length === 0) {
      setIfscStatus("idle");
      setIfscBranch("");
      return;
    }
    if (ifsc.length < 11) {
      setIfscStatus("idle");
      setIfscBranch("");
      return;
    }

    setIfscStatus("loading");
    setIfscBranch("");

    ifscTimer.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/ifsc/${ifsc}`);
        const data = await res.json();
        if (!res.ok) {
          setIfscStatus("error");
          setIfscBranch("");
          return;
        }
        if (data.bank && !bankName) setBankName(data.bank);
        setIfscBranch(`${data.branch}${data.city ? ", " + data.city : ""}`);
        setIfscStatus("ok");
      } catch {
        setIfscStatus("error");
        setIfscBranch("");
      }
    }, 600);

    return () => { if (ifscTimer.current) clearTimeout(ifscTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankIfsc]);

  // ── Submit payout request ────────────────────────────────────────────────────
  async function handlePayoutSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setPayError("");
    setPaySuccess("");
    try {
      const res = await fetch("/api/instructor/payout-requests", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          bankDetails: { accountHolder: bankHolder, accountNumber: bankAccount, ifsc: bankIfsc, bankName, pan: bankPan.toUpperCase() },
          notes: payNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setPayError(data.error); return; }
      setPaySuccess("Payout request submitted! We'll process it within 7 business days.");
      setAmount(""); setBankHolder(""); setBankAccount(""); setBankIfsc(""); setBankName(""); setBankPan(""); setPayNotes("");
      setIfscStatus("idle"); setIfscBranch("");
      loadAll();
    } finally {
      setSubmitting(false);
    }
  }

  // ── Create referral link ─────────────────────────────────────────────────────
  async function handleCreateLink(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setRefError("");
    try {
      const res = await fetch("/api/instructor/referrals", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: refCourse || undefined, label: refLabel }),
      });
      const data = await res.json();
      if (!res.ok) { setRefError(data.error); return; }
      setLinks((prev) => [data.link, ...prev]);
      setRefCourse(""); setRefLabel("");
    } finally {
      setCreating(false);
    }
  }

  // ── Deactivate referral link ─────────────────────────────────────────────────
  async function handleDeleteLink(id: string) {
    await fetch(`/api/instructor/referrals?id=${id}`, { method: "DELETE" });
    setLinks((prev) => prev.map((l) => l.id === id ? { ...l, isActive: false } : l));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  const MIN_PAYOUT = 1000;
  const hasPending = payouts.some((p) => p.status === "PENDING");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Payouts & Referrals</h1>
        <p className="text-muted-foreground/70 text-sm mt-1">
          Request earnings payouts and manage your referral links for higher revenue splits.
        </p>
      </div>

      {/* Wallet summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Available Balance",  value: wallet?.balance        ?? 0, color: "text-[#d97757]"  },
          { label: "Total Earned",       value: wallet?.totalEarned    ?? 0, color: "text-emerald-400" },
          { label: "Total Withdrawn",    value: wallet?.totalWithdrawn ?? 0, color: "text-blue-400"    },
        ].map(({ label, value, color }) => (
          <GlassCard key={label} className="text-center py-4">
            <div className={cn("text-2xl font-bold", color)}>₹{value.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          </GlassCard>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-secondary border border-border w-fit">
        {(["payouts", "referrals"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all capitalize",
              tab === t ? "bg-card border border-border text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}>
            {t === "payouts" ? "Payout Requests" : "Referral Links"}
          </button>
        ))}
      </div>

      {/* ── PAYOUT TAB ───────────────────────────────────────────────────── */}
      {tab === "payouts" && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Request form */}
          <GlassCard>
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4 text-[#d97757]" /> Request Payout
            </h2>

            {hasPending && (
              <div className="mb-4 text-sm bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg px-4 py-2.5 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                You have a pending payout request. Wait for it to be processed before requesting another.
              </div>
            )}

            <form onSubmit={handlePayoutSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Amount (₹) *</label>
                <input type="number" required min={MIN_PAYOUT} value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input-glass w-full" placeholder={`Min ₹${MIN_PAYOUT.toLocaleString()}`}
                  disabled={hasPending} />
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Available: ₹{(wallet?.balance ?? 0).toLocaleString()} · Min: ₹{MIN_PAYOUT.toLocaleString()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Account Holder *</label>
                  <input required value={bankHolder} onChange={(e) => setBankHolder(e.target.value)}
                    className="input-glass w-full" placeholder="Full name" disabled={hasPending} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Bank Name *</label>
                  <input required value={bankName} onChange={(e) => setBankName(e.target.value)}
                    className="input-glass w-full" placeholder="e.g. HDFC Bank" disabled={hasPending} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Account Number *</label>
                  <input required value={bankAccount} onChange={(e) => setBankAccount(e.target.value)}
                    className="input-glass w-full" placeholder="XXXXXXXXXX" disabled={hasPending} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">IFSC Code *</label>
                  <div className="relative">
                    <input
                      required
                      value={bankIfsc}
                      onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                      maxLength={11}
                      className={cn(
                        "input-glass w-full pr-8",
                        ifscStatus === "ok"    && "border-emerald-500/50",
                        ifscStatus === "error" && "border-red-500/50",
                      )}
                      placeholder="SBIN0001234"
                      disabled={hasPending}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      {ifscStatus === "loading" && <Loader2    className="w-3.5 h-3.5 text-muted-foreground animate-spin" />}
                      {ifscStatus === "ok"      && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      {ifscStatus === "error"   && <XCircle    className="w-3.5 h-3.5 text-red-400" />}
                    </span>
                  </div>
                  {ifscStatus === "ok" && ifscBranch && (
                    <p className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {ifscBranch}
                    </p>
                  )}
                  {ifscStatus === "error" && (
                    <p className="text-[11px] text-red-400 mt-1">IFSC code not found. Please double-check.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">PAN Number *</label>
                <input required value={bankPan}
                  onChange={(e) => setBankPan(e.target.value.toUpperCase())}
                  pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                  maxLength={10}
                  className="input-glass w-full" placeholder="ABCDE1234F"
                  disabled={hasPending} />
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Required for Razorpay Route KYC and income tax compliance.
                </p>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Notes (optional)</label>
                <textarea rows={2} value={payNotes} onChange={(e) => setPayNotes(e.target.value)}
                  className="input-glass w-full resize-none" placeholder="Any notes for the admin..."
                  disabled={hasPending} />
              </div>

              {payError   && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{payError}</p>}
              {paySuccess && <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2">{paySuccess}</p>}

              <button type="submit" disabled={submitting || hasPending} className="btn-primary w-full inline-flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                {submitting ? "Submitting…" : "Submit Payout Request"}
              </button>
            </form>
          </GlassCard>

          {/* Request history */}
          <GlassCard>
            <h2 className="text-base font-semibold text-foreground mb-4">Request History</h2>
            {payouts.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No payout requests yet.</p>
            ) : (
              <div className="space-y-3">
                {payouts.map((p) => {
                  const meta = STATUS_META[p.status] ?? STATUS_META["PENDING"];
                  const Icon = meta.icon;
                  return (
                    <div key={p.id} className="border border-border rounded-md p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-foreground">₹{p.amount.toLocaleString()}</span>
                        <span className={cn("flex items-center gap-1 text-xs font-medium", meta.color)}>
                          <Icon className="w-3.5 h-3.5" /> {meta.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Requested {new Date(p.requestedAt).toLocaleDateString()}
                        {p.processedAt && ` · Processed ${new Date(p.processedAt).toLocaleDateString()}`}
                      </p>
                      {p.adminNotes && (
                        <p className="text-xs text-muted-foreground/70 mt-1 italic">"{p.adminNotes}"</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ── REFERRALS TAB ─────────────────────────────────────────────────── */}
      {tab === "referrals" && (
        <div className="space-y-6">
          <GlassCard>
            <h2 className="text-base font-semibold text-foreground mb-1 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-emerald-400" /> Create Referral Link
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Earn <strong className="text-emerald-400">90%</strong> on every sale made through your referral links.
            </p>

            <form onSubmit={handleCreateLink} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[160px]">
                <label className="text-xs text-muted-foreground mb-1 block">Course (optional)</label>
                <Select
                  value={refCourse}
                  onValueChange={setRefCourse}
                  placeholder="All my courses"
                  options={courses.map((c) => ({ value: c.id, label: c.title }))}
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="text-xs text-muted-foreground mb-1 block">Label (optional)</label>
                <input value={refLabel} onChange={(e) => setRefLabel(e.target.value)}
                  className="input-glass w-full" placeholder="e.g. Twitter Bio" />
              </div>
              <button type="submit" disabled={creating} className="btn-primary inline-flex items-center gap-2 py-2.5">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Link
              </button>
            </form>
            {refError && <p className="mt-3 text-sm text-red-400">{refError}</p>}
          </GlassCard>

          {/* Link list */}
          <div className="space-y-3">
            {links.length === 0 && (
              <GlassCard className="text-center py-10 text-muted-foreground text-sm">
                No referral links yet. Create one above to start earning 90%.
              </GlassCard>
            )}
            {links.map((l) => (
              <GlassCard key={l.id} className={cn(!l.isActive && "opacity-50")}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{l.label ?? l.code}</span>
                      {l.courseTitle && (
                        <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                          {l.courseTitle}
                        </span>
                      )}
                      {!l.isActive && (
                        <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">Inactive</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <code className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded truncate max-w-[300px]">
                        {l.url}
                      </code>
                      <CopyButton text={l.url} />
                      <a href={l.url} target="_blank" rel="noreferrer"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 flex-shrink-0 text-center">
                    <div>
                      <div className="text-base font-bold text-foreground">{l.totalClicks}</div>
                      <div className="text-xs text-muted-foreground">Clicks</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-emerald-400">{l.conversions}</div>
                      <div className="text-xs text-muted-foreground">Sales</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-[#d97757]">{l.conversionRate}%</div>
                      <div className="text-xs text-muted-foreground">CVR</div>
                    </div>
                    {l.isActive && (
                      <button onClick={() => handleDeleteLink(l.id)}
                        className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Info callout */}
          <GlassCard className="border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-start gap-3">
              <Tag className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-foreground mb-1">How referral splits work</p>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>• Student clicks your referral link → lands on course page</li>
                  <li>• Student purchases the course (within the same session)</li>
                  <li>• You automatically earn <strong className="text-emerald-400">90%</strong> of the sale price</li>
                  <li>• Platform earns only 10% on referral-driven sales</li>
                  <li>• Works on top of your instructor coupon bonus (85%) too</li>
                </ul>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
