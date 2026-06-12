"use client";

import { useState, FormEvent } from "react";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/Button";
import { Lock, Eye, EyeOff } from "lucide-react";

export default function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to change password." });
      } else {
        setMessage({ type: "success", text: "Password changed successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard>
      <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4 sm:mb-5 flex items-center gap-2">
        <Lock className="w-4 h-4 text-[#d97757]" /> Change Password
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Password — full width */}
        <div>
          <label className="text-muted-foreground text-sm font-medium mb-1.5 block">
            Current Password
          </label>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              required
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setMessage(null); }}
              className="w-full bg-secondary border border-border rounded-md px-3 sm:px-4 py-2.5 pr-10 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#d97757]/25 focus:bg-secondary transition-all"
              placeholder="Enter current password"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground transition-colors"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* New + Confirm — side by side on sm+ */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-muted-foreground text-sm font-medium mb-1.5 block">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setMessage(null); }}
                className="w-full bg-secondary border border-border rounded-md px-3 sm:px-4 py-2.5 pr-10 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#d97757]/25 focus:bg-secondary transition-all"
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground transition-colors"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-muted-foreground text-sm font-medium mb-1.5 block">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setMessage(null); }}
              className="w-full bg-secondary border border-border rounded-md px-3 sm:px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#d97757]/25 focus:bg-secondary transition-all"
              placeholder="Re-enter new password"
            />
          </div>
        </div>

        {message && (
          <div
            className={`text-sm px-4 py-2.5 rounded-md border ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-700 dark:text-emerald-300"
                : "bg-red-500/10 border-red-400/30 text-red-700 dark:text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full sm:w-auto">
          Update Password
        </Button>
      </form>
    </GlassCard>
  );
}
