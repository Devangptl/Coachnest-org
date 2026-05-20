import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GlassCard from "@/components/GlassCard";
import Link from "next/link";
import { PlusCircle, Mail, ToggleLeft, ToggleRight, FileText, Info } from "lucide-react";
import EmailTemplateActions from "./EmailTemplateActions";
import SeedEmailTemplatesButton from "./SeedEmailTemplatesButton";

/** All active system email slugs — subscription emails removed (feature disabled). */
const SYSTEM_SLUGS: { slug: string; label: string; vars: string[]; group: string; trigger: string }[] = [
  // Auth
  { slug: "welcome",                      label: "Welcome",                        vars: ["name"],                                           group: "Auth",        trigger: "User signs up"                        },
  // Courses
  { slug: "free-enrollment",              label: "Free Course Enrollment",         vars: ["name", "courseTitle", "link"],                    group: "Courses",     trigger: "Student enrolls in a free course"     },
  { slug: "purchase-confirmation",        label: "Purchase Confirmation",          vars: ["name", "courseTitle", "amount", "link"],           group: "Courses",     trigger: "Student purchases a course"           },
  { slug: "course-update",                label: "New Lesson Added",               vars: ["name", "courseTitle", "lessonTitle", "link"],      group: "Courses",     trigger: "Instructor adds a new lesson"         },
  { slug: "course-approved",              label: "Course Approved",                vars: ["name", "courseTitle", "link"],                    group: "Courses",     trigger: "Admin approves a course"              },
  { slug: "course-rejected",              label: "Course Rejected",                vars: ["name", "courseTitle", "reason", "link"],          group: "Courses",     trigger: "Admin rejects a course"               },
  { slug: "certificate",                  label: "Certificate Issued",             vars: ["name", "courseTitle", "certUrl"],                  group: "Courses",     trigger: "Student completes all lessons"        },
  // Refunds
  { slug: "refund-submitted",             label: "Refund Request Submitted",       vars: ["name", "courseTitle", "refundAmount", "progressPercent"], group: "Refunds", trigger: "Student submits a refund request"   },
  { slug: "refund-processed",             label: "Refund Processed",               vars: ["name", "courseTitle", "refundAmount"],             group: "Refunds",     trigger: "Admin approves & processes refund"    },
  { slug: "refund-rejected",              label: "Refund Rejected",                vars: ["name", "courseTitle", "adminNotes"],               group: "Refunds",     trigger: "Admin rejects a refund request"       },
  // Payouts
  { slug: "payout-requested",             label: "Payout Request Submitted",       vars: ["name", "amount"],                                 group: "Payouts",     trigger: "Instructor requests a payout"         },
  { slug: "payout-approved",              label: "Payout Approved",                vars: ["name", "amount"],                                 group: "Payouts",     trigger: "Admin approves payout"                },
  { slug: "payout-rejected",              label: "Payout Rejected",                vars: ["name", "amount", "adminNotes"],                   group: "Payouts",     trigger: "Admin rejects payout"                 },
  { slug: "payout-processed",             label: "Payout Transferred",             vars: ["name", "amount"],                                 group: "Payouts",     trigger: "Admin marks payout as transferred"    },
  // Contact
  { slug: "contact-confirmation",         label: "Contact Form Confirmation",      vars: ["name"],                                           group: "Contact",     trigger: "User submits contact form → to user"  },
  { slug: "contact-admin-notification",   label: "Contact Admin Notification",     vars: ["name", "email", "subject", "message"],            group: "Contact",     trigger: "User submits contact form → to admin" },
  { slug: "contact-reply",                label: "Contact Reply",                  vars: ["name", "originalSubject", "replyMessage"],         group: "Contact",     trigger: "Admin replies to a contact inquiry"   },
  // Instructors
  { slug: "instructor-application-admin", label: "Instructor Application (Admin)", vars: ["instructorName", "instructorEmail"],               group: "Instructors", trigger: "Instructor applies → notifies admin"  },
  { slug: "instructor-approved",          label: "Instructor Approved",            vars: ["name"],                                           group: "Instructors", trigger: "Admin approves instructor application" },
  { slug: "instructor-rejected",          label: "Instructor Rejected",            vars: ["name", "reason"],                                 group: "Instructors", trigger: "Admin rejects instructor application"  },
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
        <div className="flex items-center gap-2">
          <SeedEmailTemplatesButton />
          <Link
            href="/admin/email-templates/new"
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <PlusCircle className="w-4 h-4" /> New Template
          </Link>
        </div>
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

        {/* Built-in variables always available in every custom template */}
        <div className="px-4 py-3 border-b border-border bg-blue-500/5">
          <p className="text-xs font-semibold text-blue-400 mb-1.5">Built-in variables — available in every template</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { v: "logo",   hint: "Logo URL — defaults to /logo.png in your public folder (override with EMAIL_LOGO_URL env var)" },
              { v: "appUrl", hint: "Your site URL (NEXT_PUBLIC_APP_URL)" },
            ].map(({ v, hint }) => (
              <span key={v} title={hint} className="text-xs px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-mono cursor-help">
                {`{{${v}}}`}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/60 mt-1.5">
            Use <code className="font-mono bg-secondary px-1 rounded">{"<img src=\"{{logo}}\" />"}</code> to embed your logo in any template.
          </p>
        </div>
        {Object.entries(
          SYSTEM_SLUGS.reduce<Record<string, typeof SYSTEM_SLUGS>>((acc, s) => {
            (acc[s.group] ??= []).push(s);
            return acc;
          }, {})
        ).map(([group, items]) => (
          <div key={group}>
            <div className="px-4 py-2 bg-secondary/30 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group}</p>
            </div>
            <div className="divide-y divide-border">
              {items.map((s) => {
                const overridden = activeSystemSlugs.has(s.slug);
                return (
                  <div key={s.slug} className="flex items-start justify-between px-4 py-3 gap-4">
                    {/* Left: status dot + label + trigger + vars */}
                    <div className="flex items-start gap-3 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${overridden ? "bg-emerald-400" : "bg-border"}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-foreground text-sm font-medium">{s.label}</p>
                          <code className="text-xs text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded">
                            {s.slug}
                          </code>
                        </div>
                        {/* Trigger / where-used */}
                        <p className="text-xs text-blue-400/80 mt-0.5 flex items-center gap-1">
                          <span className="opacity-60">⚡</span> {s.trigger}
                        </p>
                        {/* Variables */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {s.vars.map((v) => (
                            <span key={v} className="text-xs px-1 py-0.5 bg-orange-500/10 text-orange-400 rounded font-mono">
                              {`{{${v}}}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Right: override status / action */}
                    <div className="flex-shrink-0 pt-0.5">
                      {overridden ? (
                        <span className="text-xs text-emerald-400 font-medium">Overridden</span>
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
          </div>
        ))}
      </GlassCard>
    </div>
  );
}
