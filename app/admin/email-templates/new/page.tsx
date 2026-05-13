"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Eye, EyeOff, PlusCircle, X } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const VARIABLE_PRESETS = ["name", "email", "courseTitle", "subject", "link", "message", "date", "logo", "appUrl"];

const STARTER_TEMPLATE = `<h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:0 0 8px;letter-spacing:-0.5px;">
  Hello, {{name}}!
</h1>
<p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0 0 24px;">
  Your message here. You can use variables like {{name}} and {{email}} which will be replaced when sending.
</p>
<a href="{{link}}" style="display:inline-block;background:linear-gradient(135deg,#ea580c,#f97316);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 28px;border-radius:10px;margin-top:8px;">
  Click Here
</a>
<p style="color:#525252;font-size:12px;margin:24px 0 0;">
  This email was sent to {{email}}.
</p>`;

export default function NewEmailTemplatePage() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);
  const [varInput, setVarInput] = useState("");
  const [form, setForm] = useState({
    name: params.get("name") ?? "",
    slug: params.get("slug") ?? "",
    subject: "",
    htmlBody: STARTER_TEMPLATE,
    description: "",
    variables: ["name", "email"] as string[],
    isActive: true,
  });

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: f.slug === autoSlug(f.name) || f.slug === "" ? autoSlug(name) : f.slug,
    }));
  };

  const addVariable = (v: string) => {
    const clean = v.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (clean && !form.variables.includes(clean)) {
      setForm((f) => ({ ...f, variables: [...f.variables, clean] }));
    }
    setVarInput("");
  };

  const removeVariable = (v: string) => {
    setForm((f) => ({ ...f, variables: f.variables.filter((x) => x !== v) }));
  };

  const insertVariable = (v: string) => {
    setForm((f) => ({ ...f, htmlBody: f.htmlBody + `{{${v}}}` }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug || !form.subject || !form.htmlBody) {
      toast.error("Name, slug, subject, and HTML body are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create template.");
        return;
      }
      toast.success("Template created!");
      router.push("/admin/email-templates");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/admin/email-templates"
          className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Templates
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Create Email Template</h1>
        <p className="text-muted-foreground mt-1">
          Build a reusable HTML email template with variable substitution.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* Basic Info */}
            <GlassCard padding="md">
              <h3 className="text-foreground font-semibold mb-4">Template Info</h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Template Name</label>
                  <input
                    type="text"
                    className="input-glass w-full"
                    placeholder="e.g. Welcome Email"
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Slug <span className="text-muted-foreground/60 font-normal">(unique identifier)</span></label>
                  <input
                    type="text"
                    className="input-glass w-full font-mono text-sm"
                    placeholder="e.g. welcome-email"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Subject Line</label>
                  <input
                    type="text"
                    className="input-glass w-full"
                    placeholder="e.g. Welcome to CoachNest, {{name}}!"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Description <span className="text-muted-foreground/60 font-normal">(internal note)</span></label>
                  <textarea
                    className="input-glass w-full h-20 resize-none"
                    placeholder="What is this template used for?"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="accent-orange-500"
                  />
                  <span className="text-muted-foreground text-sm">Active (can be used for sending)</span>
                </label>
              </div>
            </GlassCard>

            {/* Variables */}
            <GlassCard padding="md">
              <h3 className="text-foreground font-semibold mb-1">Template Variables</h3>
              <p className="text-muted-foreground text-xs mb-4">
                Define variables like <code className="text-orange-400">{"{{name}}"}</code> that get replaced when sending.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {form.variables.map((v) => (
                  <span
                    key={v}
                    className="flex items-center gap-1 text-xs px-2 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md font-mono"
                  >
                    {`{{${v}}}`}
                    <button type="button" onClick={() => removeVariable(v)}>
                      <X className="w-3 h-3 hover:text-red-400 transition-colors" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  className="input-glass flex-1 text-sm font-mono"
                  placeholder="Add variable..."
                  value={varInput}
                  onChange={(e) => setVarInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVariable(varInput); } }}
                />
                <Button type="button" variant="ghost" onClick={() => addVariable(varInput)} className="px-3">
                  <PlusCircle className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {VARIABLE_PRESETS.filter((p) => !form.variables.includes(p)).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => addVariable(p)}
                    className="text-xs px-2 py-0.5 text-muted-foreground border border-dashed border-border rounded hover:border-orange-500/40 hover:text-orange-400 transition-colors font-mono"
                  >
                    + {p}
                  </button>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Right column - HTML editor */}
          <div className="space-y-4">
            <GlassCard padding="md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-foreground font-semibold">HTML Body</h3>
                <div className="flex items-center gap-2">
                  {form.variables.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      title={`Insert {{${v}}}`}
                      className="text-xs px-1.5 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded font-mono hover:bg-orange-500/20 transition-colors"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPreview((p) => !p)}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 text-muted-foreground border border-border rounded-md hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {preview ? "Edit" : "Preview"}
                  </button>
                </div>
              </div>

              {preview ? (
                <div
                  className="min-h-64 rounded-md border border-border p-4 text-sm overflow-auto"
                  dangerouslySetInnerHTML={{
                    __html: form.htmlBody
                      .replace(/\{\{\s*logo\s*\}\}/g, "https://www.coachnest.in/logo.png")
                      .replace(/\{\{\s*appUrl\s*\}\}/g, process.env.NEXT_PUBLIC_APP_URL ?? "https://www.coachnest.in"),
                  }}
                />
              ) : (
                <textarea
                  className="input-glass w-full font-mono text-xs leading-relaxed resize-y"
                  style={{ minHeight: "420px" }}
                  value={form.htmlBody}
                  onChange={(e) => setForm({ ...form, htmlBody: e.target.value })}
                  spellCheck={false}
                  required
                />
              )}

              <p className="text-muted-foreground/60 text-xs mt-2">
                The body is wrapped in the CoachNest email shell automatically when sending test emails.
                Use inline styles for cross-client compatibility.
              </p>
            </GlassCard>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" variant="primary" loading={loading}>
            Create Template
          </Button>
          <Link href="/admin/email-templates">
            <Button type="button" variant="ghost">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
