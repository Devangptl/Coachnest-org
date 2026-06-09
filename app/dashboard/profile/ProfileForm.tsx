"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import AvatarUploadField from "@/components/AvatarUploadField";
import { Button } from "@/components/ui/Button";
import { User, FileText, Globe } from "lucide-react";

interface ProfileFormProps {
  initialData: {
    name: string;
    bio: string;
    headline: string;
    website: string;
    avatar: string;
  };
}

export default function ProfileForm({ initialData }: ProfileFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to update profile." });
      } else {
        setMessage({ type: "success", text: "Profile updated successfully!" });
        router.refresh();
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard>
      <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4 sm:mb-5">Edit Profile</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Avatar — top of form so it's immediately visible */}
        <AvatarUploadField
          label="Avatar"
          value={form.avatar}
          onChange={(url) => handleChange("avatar", url)}
        />

        {/* Name + Headline — side by side on sm+ */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-muted-foreground text-sm font-medium mb-1.5 flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> Name
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full bg-secondary border border-border rounded-md px-3 sm:px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#d97757]/25 focus:bg-secondary transition-all"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="text-muted-foreground text-sm font-medium mb-1.5 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" /> Headline
            </label>
            <input
              type="text"
              value={form.headline}
              onChange={(e) => handleChange("headline", e.target.value)}
              className="w-full bg-secondary border border-border rounded-md px-3 sm:px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#d97757]/25 focus:bg-secondary transition-all"
              placeholder="e.g. Full Stack Developer"
            />
          </div>
        </div>

        {/* Bio — full width */}
        <div>
          <label className="text-muted-foreground text-sm font-medium mb-1.5 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" /> Bio
          </label>
          <textarea
            rows={3}
            value={form.bio}
            onChange={(e) => handleChange("bio", e.target.value)}
            className="w-full bg-secondary border border-border rounded-md px-3 sm:px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#d97757]/25 focus:bg-secondary transition-all resize-none"
            placeholder="Tell us about yourself..."
          />
        </div>

        {/* Website — full width */}
        <div>
          <label className="text-muted-foreground text-sm font-medium mb-1.5 flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" /> Website
          </label>
          <input
            type="url"
            value={form.website}
            onChange={(e) => handleChange("website", e.target.value)}
            className="w-full bg-secondary border border-border rounded-md px-3 sm:px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#d97757]/25 focus:bg-secondary transition-all"
            placeholder="https://yourwebsite.com"
          />
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
          Save Changes
        </Button>
      </form>
    </GlassCard>
  );
}
