import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { startOfDay, endOfDay, parseISO } from "date-fns";
import { prisma } from "@/lib/prisma";
import GlassCard from "@/components/GlassCard";
import { Mail, CheckCircle, XCircle, Clock } from "lucide-react";
import EmailLogsTable from "./EmailLogsTable";

async function getLogsData(
  page: number,
  status?: string,
  search?: string,
  dateFrom?: string,
  dateTo?: string
) {
  const limit = 50;
  const where = {
    ...(status && { status: status as "SENT" | "FAILED" | "PENDING" }),
    ...(search && {
      OR: [
        { to: { contains: search, mode: "insensitive" as const } },
        { subject: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...((dateFrom || dateTo) && {
      sentAt: {
        ...(dateFrom && { gte: startOfDay(parseISO(dateFrom)) }),
        ...(dateTo && { lte: endOfDay(parseISO(dateTo)) }),
      },
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
  searchParams: Promise<{
    page?: string; status?: string; search?: string;
    dateFrom?: string; dateTo?: string;
  }>;
};

export default async function EmailLogsPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const { logs, total, pages, statsMap } = await getLogsData(
    page, sp.status, sp.search, sp.dateFrom, sp.dateTo
  );

  const statCards = [
    { label: "Total Sent", value: total, icon: Mail, color: "text-blue-400" },
    { label: "Delivered", value: statsMap["SENT"] ?? 0, icon: CheckCircle, color: "text-emerald-400" },
    { label: "Failed", value: statsMap["FAILED"] ?? 0, icon: XCircle, color: "text-red-400" },
    { label: "Pending", value: statsMap["PENDING"] ?? 0, icon: Clock, color: "text-yellow-400" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl sm:text-3xl font-bold text-foreground">Email Logs</h1>
        <p className="text-muted-foreground mt-1">
          Track all emails sent through the platform.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={stat.label} className="flex flex-col items-center text-center gap-2 sm:flex-row sm:text-left sm:gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                <Icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <div className="text-xl md:text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-muted-foreground text-[10px] sm:text-xs md:text-sm leading-tight">{stat.label}</div>
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
          currentDateFrom={sp.dateFrom}
          currentDateTo={sp.dateTo}
        />
      </GlassCard>
    </div>
  );
}
