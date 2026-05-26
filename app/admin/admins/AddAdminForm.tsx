"use client";

/**
 * Form for SUPER_ADMIN to promote an existing user to ADMIN with a sub-role.
 * Calls POST /api/admin/admins, refreshes the page on success.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { UserPlus } from "lucide-react";
import {
  ADMIN_SUB_ROLES,
  ADMIN_SUB_ROLE_LABELS,
  type AdminSubRole,
} from "@/lib/admin-permissions";

export default function AddAdminForm() {
  const [email, setEmail] = useState("");
  const [subRole, setSubRole] = useState<AdminSubRole>("SUPPORT");
  const [submitting, setSubmitting] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Enter an email.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), subRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to add admin.");
      toast.success(`${data.user.name} is now ${ADMIN_SUB_ROLE_LABELS[subRole]}.`);
      setEmail("");
      setSubRole("SUPPORT");
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add admin.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-card border border-border rounded-lg p-4 mb-6 flex flex-col sm:flex-row gap-3 sm:items-end"
    >
      <div className="flex-1">
        <label className="block text-xs text-muted-foreground font-medium mb-1">
          User email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          disabled={submitting}
          className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-[#d97757] disabled:opacity-50"
        />
      </div>

      <div className="sm:w-48">
        <label className="block text-xs text-muted-foreground font-medium mb-1">
          Sub-role
        </label>
        <select
          value={subRole}
          onChange={(e) => setSubRole(e.target.value as AdminSubRole)}
          disabled={submitting}
          className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#d97757] disabled:opacity-50"
        >
          {ADMIN_SUB_ROLES.map((r) => (
            <option key={r} value={r}>
              {ADMIN_SUB_ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary flex items-center justify-center gap-2 text-sm disabled:opacity-50"
      >
        <UserPlus className="w-4 h-4" />
        {submitting ? "Adding…" : "Add admin"}
      </button>
    </form>
  );
}
