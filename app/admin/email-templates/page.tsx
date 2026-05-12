import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GlassCard from "@/components/GlassCard";
import Link from "next/link";
import { PlusCircle, Mail, ToggleLeft, ToggleRight, FileText, Info } from "lucide-react";
import EmailTemplateActions from "./EmailTemplateActions";

/** All system email slugs with their available variables. */
const SYSTEM_SLUGS: { slug: string; label: string; vars: string[] }[] = [
  { slug: "welcome",                     label: "Welcome Email",                    vars: ["name"] },
  { slug: "subscription-activated",      label: "Subscription Activated",           vars: ["name", "plan", "billing"] },
  { slug: "plan-changed",                label: "Plan Changed",                     vars: ["name", "oldPlan", "newPlan", "billing", "action"] },
  { slug: "subscription-cancelled",      label: "Subscription Cancelled",           vars: ["name", "plan", "endDate"] },
  { slug: "subscription-resumed",        label: "Subscription Resumed",             vars: ["name", "plan"] },
  { slug: "payment-failed",              label: "Payment Failed",                   vars: ["name"] },
  { slug: "purchase-confirmation",       label: "Purchase Confirmation",            vars: ["name", "courseTitle", "amount", "link"] },
  { slug: "course-update",               label: "New Lesson Notification",          vars: ["name", "courseTitle", "lessonTitle", "link"] },
  { slug: "contact-confirmation",        label: "Contact Form Confirmation",        vars: ["name"] },
  { slug: "contact-admin-notification",  label: "Contact Admin Notification",       vars: ["name", "email", "subject", "message"] },
  { slug: "contact-reply",               label: "Contact Reply",                    vars: ["name", "originalSubject", "replyMessage"] },
  { slug: "certificate",                 label: "Certificate Issued",               vars: ["name", "courseTitle", "certUrl"] },
  { slug: "instructor-application-admin",label: "Instructor Application (Admin)",   vars: ["instructorName", "instructorEmail"] },
  { slug: "instructor-approved",         label: "Instructor Approved",              vars: ["name"] },
  { slug: "instructor-rejected",         label: "Instructor Rejected",              vars: ["name", "reason"] },
];

async function getTemplates() {
  return prisma.emailTemplate.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { logs: true } } },
  });
}

export default async function EmailTemplatesPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const templates = await getTemplates();
  const active = templates.filter((t) => t.isActive).length;
  const activeSystemSlugs = new Set(templates.filter((t) => t.isActive).map((t) => t.slug));

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Email Templates</h1>
          <p className="text-muted-foreground mt-1">
            Create custom templates to override system emails. Use the exact slug to replace a built-in email.
          </p>
        </div>
        <Link
          href="/admin/email-templates/new"
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <PlusCircle className="w-4 h-4" /> New Template
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Templates", value: templates.length, icon: FileText, color: "text-blue-400" },
          { label: "Active", value: active, icon: ToggleRight, color: "text-emerald-400" },
          { label: "Inactive", value: templates.length - active, icon: ToggleLeft, color: "text-muted-foreground" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={stat.label} className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center">
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-muted-foreground text-sm">{stat.label}</div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Custom templates */}
      <GlassCard padding="sm" className="mb-8">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-foreground font-semibold">Custom Templates</h2>
          <span className="text-muted-foreground/70 text-sm">{templates.length} total</span>
        </div>

        {templates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="mb-4">No custom templates yet.</p>
            <Link href="/admin/email-templates/new" className="text-[#d97757] hover:text-orange-300 text-sm">
              Create your first template
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {templates.map((tpl) => (
              <div key={tpl.id} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-[#d97757]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-foreground font-medium text-sm truncate">{tpl.name}</p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          tpl.isActive
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-secondary text-muted-foreground border border-border"
                        }`}
                      >
                        {tpl.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-muted-foreground text-xs font-mono">{tpl.slug}</p>
                      <span className="text-muted-foreground/50 text-xs">·</span>
                      <p className="text-muted-foreground text-xs truncate max-w-xs">{tpl.subject}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                  <span className="text-muted-foreground text-xs">{tpl._count.logs} sent</span>
                  <EmailTemplateActions templateId={tpl.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* System email reference */}
      <GlassCard padding="sm">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Info className="w-4 h-4 text-blue-400" />
          <h2 className="text-foreground font-semibold">System Email Slugs</h2>
          <span className="text-muted-foreground text-xs ml-auto">
            Create a template with the exact slug to override that system email
          </span>
        </div>
        <div className="divide-y divide-border">
          {SYSTEM_SLUGS.map((s) => {
            const overridden = activeSystemSlugs.has(s.slug);
            return (
              <div key={s.slug} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${overridden ? "bg-emerald-400" : "bg-border"}`}
                  />
                  <div className="min-w-0">
                    <p className="text-foreground text-sm">{s.label}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {s.vars.map((v) => (
                        <span key={v} className="text-xs px-1 py-0.5 bg-orange-500/10 text-orange-400 rounded font-mono">
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                  <code className="text-xs text-muted-foreground font-mono bg-secondary px-2 py-0.5 rounded">
                    {s.slug}
                  </code>
                  {overridden ? (
                    <span className="text-xs text-emerald-400">Overridden</span>
                  ) : (
                    <Link
                      href={`/admin/email-templates/new?slug=${s.slug}&name=${encodeURIComponent(s.label)}`}
                      className="text-xs text-[#d97757] hover:text-orange-300 transition-colors"
                    >
                      Override
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
