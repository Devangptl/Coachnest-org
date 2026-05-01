"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye, EyeOff, Loader2, Mail, Lock, User,
  GraduationCap, ArrowRight, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "STUDENT" | "INSTRUCTOR";

// ── Hardcoded Color Palette ─────────────────────────────────────────────────
const COLORS = {
  primary: "#EA7F2C",      // Professional orange
  primaryDark: "#D97757",
  white: "#FFFFFF",
  background: "#F9FAFB",
  cardBg: "#FFFFFF",
  border: "#E5E7EB",
  text: "#1F2937",
  textMuted: "#6B7280",
  lightBg: "#F3F4F6",
  errorBg: "#FEE2E2",
  errorBorder: "#FCA5A5",
  errorText: "#DC2626",
  successGreen: "#10B981",
};

// ── Password strength ───────────────────────────────────────────────────────
function passwordStrength(pwd: string) {
  if (!pwd) return { score: 0, label: "", barColor: "", textColor: "" };
  let s = 0;
  if (pwd.length >= 8) s++;
  if (pwd.length >= 12) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  
  const map = [
    { label: "Weak", barColor: "#EF4444", textColor: "#DC2626" },
    { label: "Weak", barColor: "#EF4444", textColor: "#DC2626" },
    { label: "Fair", barColor: "#F59E0B", textColor: "#D97706" },
    { label: "Good", barColor: "#EAB308", textColor: "#CA8A04" },
    { label: "Strong", barColor: "#10B981", textColor: "#059669" },
    { label: "Great", barColor: "#10B981", textColor: "#047857" },
  ];
  return { score: s, ...map[s] };
}

// ── Component ───────────────────────────────────────────────────────────────
export default function SignupPage() {
  const router = useRouter();

  const [role, setRole] = useState<Role>("STUDENT");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(password);

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
      router.push(role === "INSTRUCTOR" ? "/instructor" : "/onboarding");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{ backgroundColor: COLORS.background, minHeight: "100vh" }}
      className="flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-16"
    >
      <style>{`
        * {
          --color-primary: ${COLORS.primary};
          --color-primary-dark: ${COLORS.primaryDark};
          --color-white: ${COLORS.white};
          --color-background: ${COLORS.background};
          --color-card-bg: ${COLORS.cardBg};
          --color-border: ${COLORS.border};
          --color-text: ${COLORS.text};
          --color-text-muted: ${COLORS.textMuted};
          --color-light-bg: ${COLORS.lightBg};
          --color-error-bg: ${COLORS.errorBg};
          --color-error-border: ${COLORS.errorBorder};
          --color-error-text: ${COLORS.errorText};
          --color-success: ${COLORS.successGreen};
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .fade-in-down {
          animation: fadeInDown 0.6s ease-out;
        }

        .fade-in {
          animation: fadeIn 0.5s ease-out;
        }

        .input-field {
          width: 100%;
          padding: 12px 14px 12px 40px;
          border: 1px solid ${COLORS.border};
          border-radius: 8px;
          font-size: 14px;
          background-color: ${COLORS.cardBg};
          color: ${COLORS.text};
          transition: all 0.2s ease;
          font-family: inherit;
          box-sizing: border-box;
        }

        .input-field::placeholder {
          color: ${COLORS.textMuted};
        }

        .input-field:focus {
          outline: none;
          border-color: ${COLORS.primary};
          box-shadow: 0 0 0 3px rgba(234, 127, 44, 0.1);
          background-color: ${COLORS.white};
        }

        .input-field:hover {
          border-color: ${COLORS.primary}40;
        }

        .btn-primary {
          width: 100%;
          padding: 12px 16px;
          background-color: ${COLORS.primary};
          color: ${COLORS.white};
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: inherit;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: ${COLORS.primaryDark};
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(234, 127, 44, 0.3);
        }

        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-primary:disabled {
          opacity: 0.8;
          cursor: not-allowed;
        }

        .role-btn {
          padding: 12px 16px;
          border: 1px solid ${COLORS.border};
          border-radius: 8px;
          background-color: transparent;
          color: ${COLORS.textMuted};
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: inherit;
        }

        .role-btn:hover {
          color: ${COLORS.text};
          border-color: ${COLORS.primary};
          background-color: ${COLORS.lightBg};
        }

        .role-btn.active {
          background-color: ${COLORS.cardBg};
          border-color: ${COLORS.primary};
          color: ${COLORS.text};
          box-shadow: 0 2px 8px rgba(234, 127, 44, 0.15);
        }

        .role-btn.active svg {
          color: ${COLORS.primary};
        }

        .label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: ${COLORS.text};
          margin-bottom: 8px;
        }

        .error-banner {
          padding: 12px 16px;
          background-color: ${COLORS.errorBg};
          border: 1px solid ${COLORS.errorBorder};
          border-radius: 8px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .error-banner svg {
          color: ${COLORS.errorText};
          flex-shrink: 0;
          margin-top: 2px;
        }

        .error-banner p {
          color: ${COLORS.errorText};
          font-size: 14px;
          margin: 0;
        }

        .strength-bar {
          height: 4px;
          border-radius: 2px;
          background-color: ${COLORS.border};
          transition: all 0.3s ease;
        }

        .divider-container {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 24px 0;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background-color: ${COLORS.border};
        }

        .divider-text {
          font-size: 13px;
          color: ${COLORS.textMuted};
        }

        .footer-text {
          text-align: center;
          font-size: 14px;
          color: ${COLORS.textMuted};
          margin: 0;
        }

        .footer-link {
          color: ${COLORS.primary};
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .footer-link:hover {
          color: ${COLORS.primaryDark};
        }

        .terms-text {
          font-size: 12px;
          color: ${COLORS.textMuted};
          line-height: 1.5;
          margin: 0;
        }

        .terms-link {
          color: ${COLORS.primary};
          text-decoration: none;
          transition: color 0.2s ease;
          cursor: pointer;
        }

        .terms-link:hover {
          color: ${COLORS.primaryDark};
        }
      `}</style>

      {/* Logo Container */}
      <div className="fade-in-down mb-12 sm:mb-16">
        <Link href="/">
          <img
            src="/logo.png"
            alt="CoachNest"
            style={{
              height: "28px",
              width: "auto",
              objectFit: "contain",
            }}
          />
        </Link>
      </div>

      {/* Main Card */}
      <div
        style={{
          backgroundColor: COLORS.cardBg,
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 24px rgba(0, 0, 0, 0.05)",
          borderRadius: "12px",
          border: `1px solid ${COLORS.border}`,
          maxWidth: "420px",
          width: "100%",
          padding: "48px 32px",
        }}
        className="fade-in"
      >
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 700,
              color: COLORS.text,
              marginBottom: "8px",
              letterSpacing: "-0.5px",
              margin: 0,
            }}
          >
            Create your account
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: COLORS.textMuted,
              lineHeight: "1.5",
              margin: "8px 0 0 0",
            }}
          >
            Join thousands of learners and educators worldwide
          </p>
        </div>

        {/* Role Selector */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            marginBottom: "28px",
          }}
        >
          {(["STUDENT", "INSTRUCTOR"] as Role[]).map((r) => {
            const Icon = r === "STUDENT" ? User : GraduationCap;
            const isActive = role === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn("role-btn", isActive && "active")}
              >
                <Icon size={16} />
                {r === "STUDENT" ? "Student" : "Instructor"}
              </button>
            );
          })}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate style={{ marginBottom: "24px" }}>
          {/* Error Message */}
          {error && (
            <div className="error-banner fade-in" style={{ marginBottom: "16px" }}>
              <AlertCircle size={16} />
              <p>{error}</p>
            </div>
          )}

          {/* Full Name Field */}
          <div style={{ marginBottom: "16px" }}>
            <label className="label" htmlFor="name">
              Full name
            </label>
            <div style={{ position: "relative" }}>
              <User
                size={16}
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: COLORS.textMuted,
                  pointerEvents: "none",
                }}
              />
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="Jane Doe"
                required
                autoComplete="name"
              />
            </div>
          </div>

          {/* Email Field */}
          <div style={{ marginBottom: "16px" }}>
            <label className="label" htmlFor="email">
              Email address
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={16}
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: COLORS.textMuted,
                  pointerEvents: "none",
                }}
              />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: "16px" }}>
            <label className="label" htmlFor="password">
              Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={16}
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: COLORS.textMuted,
                  pointerEvents: "none",
                }}
              />
              <input
                id="password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Min. 8 characters"
                minLength={8}
                required
                autoComplete="new-password"
                style={{ paddingRight: "40px" }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: COLORS.textMuted,
                  transition: "color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = COLORS.text;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = COLORS.textMuted;
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <div style={{ marginTop: "12px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: "4px",
                    marginBottom: "8px",
                  }}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      className="strength-bar"
                      style={{
                        backgroundColor:
                          n <= strength.score ? strength.barColor : COLORS.border,
                      }}
                    />
                  ))}
                </div>
                <p style={{ fontSize: "12px", color: COLORS.textMuted, margin: "0" }}>
                  Strength:{" "}
                  <span
                    style={{
                      fontWeight: 600,
                      color: strength.textColor,
                    }}
                  >
                    {strength.label}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Terms & Privacy */}
          <p className="terms-text" style={{ marginBottom: "20px" }}>
            By creating an account you agree to our{" "}
            <span className="terms-link">Terms of Service</span> and{" "}
            <span className="terms-link">Privacy Policy</span>.
          </p>

          {/* Submit Button */}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                Creating account…
              </>
            ) : (
              <>
                Join as {role === "INSTRUCTOR" ? "Instructor" : "Student"}
                <ArrowRight
                  size={16}
                  style={{ transition: "transform 0.2s ease" }}
                />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="divider-container">
          <div className="divider-line" />
          <span className="divider-text">or</span>
          <div className="divider-line" />
        </div>

        {/* Sign In Link */}
        <p className="footer-text">
          Already have an account?{" "}
          <Link href="/login" className="footer-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
