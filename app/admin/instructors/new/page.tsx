"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/Button";

export default function NewInstructorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    headline: "",
    bio: "",
    website: "",
  });

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast.error("Name, email, and password are required.");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          headline: form.headline.trim() || null,
          bio: form.bio.trim() || null,
          website: form.website.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to create instructor.");
        return;
      }

      toast.success("Instructor created!");
      router.push("/admin/instructors");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full bg-secondary border border-border rounded-md px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-orange-400/25 transition-all";

  return (
    <div>
      <Link
        href="/admin/instructors"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Instructors
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Add Instructor</h1>
        <p className="text-muted-foreground mt-1">
          Create a new instructor account. The user will sign in with the email
          and password you set here.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <GlassCard padding="md">
          <h3 className="text-foreground font-semibold mb-4">Account</h3>
          <div className="space-y-3">
            <div>
              <label className="text-muted-foreground text-sm font-medium mb-1.5 block">
                Full Name *
              </label>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div>
              <label className="text-muted-foreground text-sm font-medium mb-1.5 block">
                Email *
              </label>
              <input
                type="email"
                className={inputCls}
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="jane@example.com"
                required
              />
            </div>
            <div>
              <label className="text-muted-foreground text-sm font-medium mb-1.5 block">
                Password *
              </label>
              <input
                type="password"
                className={inputCls}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
              <p className="text-muted-foreground/70 text-xs mt-1">
                Share this password securely with the instructor. They can
                change it later from account settings.
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard padding="md">
          <h3 className="text-foreground font-semibold mb-4">Profile (optional)</h3>
          <div className="space-y-3">
            <div>
              <label className="text-muted-foreground text-sm font-medium mb-1.5 block">
                Headline
              </label>
              <input
                className={inputCls}
                value={form.headline}
                onChange={(e) => update("headline", e.target.value)}
                placeholder="Senior Full-Stack Engineer"
              />
            </div>
            <div>
              <label className="text-muted-foreground text-sm font-medium mb-1.5 block">
                Website
              </label>
              <input
                type="url"
                className={inputCls}
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="text-muted-foreground text-sm font-medium mb-1.5 block">
                Bio
              </label>
              <textarea
                rows={4}
                className={`${inputCls} resize-none`}
                value={form.bio}
                onChange={(e) => update("bio", e.target.value)}
                placeholder="Short bio shown on the instructor profile..."
              />
            </div>
          </div>
        </GlassCard>

        <div className="flex gap-3">
          <Button type="submit" variant="primary" loading={loading}>
            Create Instructor
          </Button>
          <Link href="/admin/instructors">
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
