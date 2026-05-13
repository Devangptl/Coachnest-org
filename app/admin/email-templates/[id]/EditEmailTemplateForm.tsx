"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Eye, EyeOff, PlusCircle, X, Send } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { EmailTemplate } from "@prisma/client";

const VARIABLE_PRESETS = ["name", "email", "courseTitle", "subject", "link", "message", "date", "logo", "appUrl"];

export default function EditEmailTemplateForm({ template }: { template: EmailTemplate }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [varInput, setVarInput] = useState("");
  const [form, setForm] = useState({
    name: template.name,
    slug: template.slug,
    subject: template.subject,
    htmlBody: template.htmlBody,
    description: template.description ?? "",
    variables: template.variables as string[],
    isActive: template.isActive,
  });

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
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update template.");
        return;
      }
      toast.success("Template updated!");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error("Enter a recipient email for the test.");
      return;
    }
    setSendingTest(true);
    try {
      // Build sample variable values for preview
      const sampleVars: Record<string, string> = {};
      form.variables.forEach((v) => { sampleVars[v] = `[${v}]`; });

      const res = await fetch(`/api/admin/email-templates/${template.id}/send-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail, variables: sampleVars }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send test email.");
        return;
      }
      toast.success(`Test email sent to ${testEmail}`);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSendingTest(false);
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
        <h1 className="text-3xl font-bold text-foreground">Edit Template</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">{template.slug}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            <GlassCard padding="md">
              <h3 className="text-foreground font-semibold mb-4">Template Info</h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Template Name</label>
                  <input
                    type="text"
                    className="input-glass w-full"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Slug</label>
                  <input
                    type="text"
                    className="input-glass w-full font-mono text-sm"
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
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    className="input-glass w-full h-20 resize-none"
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
                  <span className="text-muted-foreground text-sm">Active</span>
                </label>
              </div>
            </GlassCard>

            <GlassCard padding="md">
              <h3 className="text-foreground font-semibold mb-1">Template Variables</h3>
              <p className="text-muted-foreground text-xs mb-3">
                Use <code className="text-orange-400">{"{{variable}}"}</code> in subject and body.
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

            {/* Send test */}
            <GlassCard padding="md">
              <h3 className="text-foreground font-semibold mb-3">Send Test Email</h3>
              <p className="text-muted-foreground text-xs mb-3">
                Variables will be replaced with placeholder values like <code className="text-orange-400">[name]</code>.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  className="input-glass flex-1 text-sm"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  loading={sendingTest}
                  onClick={handleSendTest}
                  className="flex items-center gap-1.5 px-3"
                >
                  <Send className="w-3.5 h-3.5" /> Send
                </Button>
              </div>
            </GlassCard>
          </div>

          {/* Right column - HTML editor */}
          <div>
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
            </GlassCard>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" variant="primary" loading={loading}>
            Save Changes
          </Button>
          <Link href="/admin/email-templates">
            <Button type="button" variant="ghost">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
