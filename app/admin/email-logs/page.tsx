import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GlassCard from "@/components/GlassCard";
import { Mail, CheckCircle, XCircle, Clock } from "lucide-react";
import EmailLogsTable from "./EmailLogsTable";

async function getLogsData(page: number, status?: string, search?: string) {
  const limit = 50;
  const where = {
    ...(status && { status: status as "SENT" | "FAILED" | "PENDING" }),
    ...(search && {
      OR: [
        { to: { contains: search, mode: "insensitive" as const } },
        { subject: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [logs, total, stats] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { template: { select: { id: true, name: true, slug: true } } },
    }),
    prisma.emailLog.count({ where }),
    prisma.emailLog.groupBy({ by: ["status"], _count: { status: true } }),
  ]);

  return {
    logs,
    total,
    pages: Math.ceil(total / limit),
    statsMap: Object.fromEntries(stats.map((s) => [s.status, s._count.status])) as Record<string, number>,
  };
}

type Props = {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
};

export default async function EmailLogsPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const { logs, total, pages, statsMap } = await getLogsData(page, sp.status, sp.search);

  const statCards = [
    { label: "Total Sent", value: total, icon: Mail, color: "text-blue-400" },
    { label: "Delivered", value: statsMap["SENT"] ?? 0, icon: CheckCircle, color: "text-emerald-400" },
    { label: "Failed", value: statsMap["FAILED"] ?? 0, icon: XCircle, color: "text-red-400" },
    { label: "Pending", value: statsMap["PENDING"] ?? 0, icon: Clock, color: "text-yellow-400" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Email Logs</h1>
        <p className="text-muted-foreground mt-1">
          Track all emails sent through the platform.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => {
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

      <GlassCard padding="sm">
        <EmailLogsTable
          logs={logs as Parameters<typeof EmailLogsTable>[0]["logs"]}
          total={total}
          page={page}
          pages={pages}
          currentStatus={sp.status}
          currentSearch={sp.search}
        />
      </GlassCard>
    </div>
  );
}
