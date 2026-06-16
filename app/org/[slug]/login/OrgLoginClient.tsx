"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { ORG_ADMIN_AREA_ROLES, ORG_AUTHOR_ROLES } from "@/lib/org-permissions";
import type { OrgRole } from "@/lib/generated/prisma/client";

interface Props {
  org: { name: string; slug: string; logo: string | null };
}

export default function OrgLoginClient({ org }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const registered = searchParams.get("registered") === "1";
  const notMember = searchParams.get("error") === "not_member";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(notMember ? "Your account is not a member of this organization." : "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "email_not_confirmed"
            ? "Please confirm your email before signing in."
            : data.error ?? "Login failed.",
        );
        return;
      }

      // Authoritative membership check — claims may lag right after signup.
      const meRes = await fetch(`/api/org/${org.slug}/me`);
      if (!meRes.ok) {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
        setError("This account is not a member of this organization.");
        return;
      }
      const me = await meRes.json();

      const role = me.role as OrgRole;
      const portal = ORG_ADMIN_AREA_ROLES.includes(role)
        ? "admin"
        : ORG_AUTHOR_ROLES.includes(role)
          ? "instructor"
          : "student";

      if (me.org.status !== "ACTIVE" && portal !== "admin") {
        router.push(`/org/${org.slug}/expired`);
      } else if (me.org.status !== "ACTIVE" && portal === "admin") {
        router.push(`/org/${org.slug}/admin/billing`);
      } else {
        router.push(from && from.startsWith(`/org/${org.slug}/`) ? from : `/org/${org.slug}/${portal}`);
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-[400px] animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          {org.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo} alt={org.name} className="w-14 h-14 rounded-2xl object-cover mb-4" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-orange-500/15 text-orange-500 flex items-center justify-center font-bold text-lg mb-4">
              {org.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-bold text-foreground tracking-tight text-center">{org.name}</h1>
          <p className="text-muted-foreground text-sm mt-1.5">Sign in to your organization workspace</p>
        </div>

        {registered && (
          <div className="flex items-start gap-2.5 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 mb-4 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-green-500 text-sm">
              Organization activated! Sign in with your admin account to get started.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="label" htmlFor="email">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
              <input
                id="email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-glass pl-10" placeholder="you@company.com"
                required autoComplete="email"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label !mb-0" htmlFor="password">Password</label>
              <Link href="/forgot-password" className="text-xs text-orange-500 hover:text-[#d97757] transition-colors">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
              <input
                id="password" type={showPass ? "text" : "password"} value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-glass pl-10 pr-12" placeholder="••••••••"
                required autoComplete="current-password"
              />
              <button
                type="button" tabIndex={-1} onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? "Hide password" : "Show password"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-2 group">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
              : <>Sign In <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" /></>}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Powered by{" "}
          <Link href="/" className="text-orange-500 hover:text-[#d97757] transition-colors">Coachnest</Link>
        </p>
      </div>
    </div>
  );
}
