/**
 * Signup page — registration form with role selection (Student / Instructor).
 */
"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Eye, EyeOff, Loader2, GraduationCap, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "STUDENT" | "INSTRUCTOR";

export default function SignupPage() {
  const router = useRouter();
  const [role,     setRole]     = useState<Role>("STUDENT");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Signup failed.");
        return;
      }

      router.push(role === "INSTRUCTOR" ? "/instructor" : "/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="CoachNest" className="h-6 w-auto object-contain mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white">Create account</h1>
          <p className="text-muted-foreground mt-1">Join as a student or instructor</p>
        </div>

        {/* Glass form card */}
        <div className="bg-card border border-border rounded-lg p-8 shadow-2xl">
          {/* Role selector */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button
              type="button"
              onClick={() => setRole("STUDENT")}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                role === "STUDENT"
                  ? "bg-blue-500/15 border-blue-400/40 text-blue-300"
                  : "bg-secondary border-border text-muted-foreground hover:border-border/80"
              )}
            >
              <User className="w-5 h-5" />
              <span className="text-sm font-medium">Student</span>
              <span className="text-[11px] opacity-70 text-center leading-tight">Learn from courses</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("INSTRUCTOR")}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                role === "INSTRUCTOR"
                  ? "bg-amber-500/15 border-amber-400/40 text-amber-300"
                  : "bg-secondary border-border text-muted-foreground hover:border-border/80"
              )}
            >
              <GraduationCap className="w-5 h-5" />
              <span className="text-sm font-medium">Instructor</span>
              <span className="text-[11px] opacity-70 text-center leading-tight">Teach & earn</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="label">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-glass"
                placeholder="Jane Doe"
                required
                autoComplete="name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-glass"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-glass pr-12"
                  placeholder="Min. 6 characters"
                  minLength={6}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center flex items-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
              ) : (
                `Join as ${role === "INSTRUCTOR" ? "Instructor" : "Student"}`
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-muted-foreground text-sm mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-orange-400 hover:text-orange-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
