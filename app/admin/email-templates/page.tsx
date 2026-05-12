import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GlassCard from "@/components/GlassCard";
import Link from "next/link";
import { PlusCircle, Mail, ToggleLeft, ToggleRight, FileText } from "lucide-react";
import EmailTemplateActions from "./EmailTemplateActions";

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

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Email Templates</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage custom email templates for your platform.
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

      {/* Templates table */}
      <GlassCard padding="sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-foreground font-semibold">All Templates</h2>
          <span className="text-muted-foreground/70 text-sm">{templates.length} total</span>
        </div>

        {templates.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="mb-4">No email templates yet.</p>
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
                    {tpl.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tpl.variables.map((v) => (
                          <span key={v} className="text-xs px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded font-mono">
                            {`{{${v}}}`}
                          </span>
                        ))}
                      </div>
                    )}
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
    </div>
  );
}
