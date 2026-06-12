"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, Save } from "lucide-react";

interface Props {
  slug: string;
  initial: { name: string; slug: string; email: string | null; phone: string | null; logo: string | null };
}

export default function OrgSettingsClient({ slug, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [logo, setLogo] = useState(initial.logo ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/org/${slug}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: email || null,
          phone: phone || null,
          logo: logo || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Settings saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 max-w-xl space-y-4">
      <div>
        <label className="label" htmlFor="name">Organization name</label>
        <input
          id="name" type="text" className="input-glass"
          value={name} onChange={(e) => setName(e.target.value)} required minLength={2}
        />
      </div>
      <div>
        <label className="label" htmlFor="slug">Workspace URL</label>
        <input id="slug" type="text" className="input-glass opacity-60" value={`/org/${initial.slug}`} disabled />
        <p className="text-xs text-muted-foreground mt-1.5">
          The workspace URL cannot be changed. Contact platform support if you need a different one.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="email">Billing email</label>
          <input
            id="email" type="email" className="input-glass"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input
            id="phone" type="tel" className="input-glass"
            value={phone} onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="logo">Logo URL</label>
        <input
          id="logo" type="url" className="input-glass" placeholder="https://…"
          value={logo} onChange={(e) => setLogo(e.target.value)}
        />
      </div>
      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Changes
      </button>
    </form>
  );
}
