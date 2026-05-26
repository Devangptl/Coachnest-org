"use client";

/**
 * Inline sub-role picker for the /admin/admins management page.
 * Calls PATCH /api/admin/admins/[id]/sub-role and refreshes the
 * server component on success.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ADMIN_SUB_ROLES,
  ADMIN_SUB_ROLE_LABELS,
  type AdminSubRole,
} from "@/lib/admin-permissions";

export default function AdminSubRoleSelect({
  userId,
  initial,
}: {
  userId: string;
  initial: AdminSubRole;
}) {
  const [value, setValue] = useState<AdminSubRole>(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function update(next: AdminSubRole) {
    const prev = value;
    setValue(next);
    try {
      const res = await fetch(`/api/admin/admins/${userId}/sub-role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subRole: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update sub-role.");
      }
      toast.success(`Sub-role updated to ${ADMIN_SUB_ROLE_LABELS[next]}`);
      startTransition(() => router.refresh());
    } catch (err) {
      setValue(prev);
      toast.error(err instanceof Error ? err.message : "Failed to update sub-role.");
    }
  }

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => update(e.target.value as AdminSubRole)}
      className="text-sm bg-secondary border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-[#d97757] disabled:opacity-50"
    >
      {ADMIN_SUB_ROLES.map((r) => (
        <option key={r} value={r}>
          {ADMIN_SUB_ROLE_LABELS[r]}
        </option>
      ))}
    </select>
  );
}
