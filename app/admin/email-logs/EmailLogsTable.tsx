"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Search, Trash2 } from "lucide-react";
import { UrlDateRangeFilter } from "@/components/ui/DateRangeFilter";
import { useConfirm } from "@/components/ui/UIDialogProvider";
import toast from "react-hot-toast";

type Log = {
  id: string;
  to: string;
  subject: string;
  status: "SENT" | "FAILED" | "PENDING";
  templateName: string | null;
  resendId: string | null;
  error: string | null;
  sentAt: Date | string;
  template: { id: string; name: string; slug: string } | null;
};

type Props = {
  logs: Log[];
  total: number;
  page: number;
  pages: number;
  currentStatus?: string;
  currentSearch?: string;
  currentDateFrom?: string;
  currentDateTo?: string;
};

const STATUS_ICONS = {
  SENT: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
  FAILED: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  PENDING: <Clock className="w-3.5 h-3.5 text-yellow-400" />,
};

const STATUS_CLASSES = {
  SENT: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  FAILED: "bg-red-500/10 text-red-400 border-red-500/20",
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

export default function EmailLogsTable({
  logs, total, page, pages, currentStatus, currentSearch, currentDateFrom, currentDateTo,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(currentSearch ?? "");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const confirm = useConfirm();

  const pushParams = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = {
      page: "1",
      status: currentStatus,
      search: currentSearch,
      dateFrom: currentDateFrom,
      dateTo: currentDateTo,
      ...params,
    };
    Object.entries(merged).forEach(([k, v]) => { if (v) sp.set(k, v); });
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    pushParams({ search: search || undefined, page: "1" });
  };

  const handleDelete = async (id: string) => {
    if (!await confirm("Delete this log entry?", { title: "Delete Log", confirmText: "Delete" })) return;
    try {
      const res = await fetch(`/api/admin/email-logs/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to delete log.");
        return;
      }
      toast.success("Log deleted.");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    }
  };

  const filterBtns = [
    { label: "All", value: undefined },
    { label: "Delivered", value: "SENT" },
    { label: "Failed", value: "FAILED" },
    { label: "Pending", value: "PENDING" },
  ];

  return (
    <>
      {/* Filters */}
      <div className="px-4 py-3 border-b border-border space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          {filterBtns.map((btn) => (
            <button
              key={btn.label}
              onClick={() => pushParams({ status: btn.value, page: "1" })}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                currentStatus === btn.value
                  ? "bg-orange-500/20 text-foreground border border-[#d97757]/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              className="input-glass pl-8 pr-3 py-1.5 text-sm w-52"
              placeholder="Search email or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </form>
      </div>
      <UrlDateRangeFilter compact />
      </div>

      {/* Table header */}
      <div className="hidden md:grid grid-cols-[1fr_1fr_120px_140px_40px] gap-3 px-4 py-2 border-b border-border text-xs text-muted-foreground font-medium">
        <span>Recipient</span>
        <span>Subject</span>
        <span>Template</span>
        <span>Sent At</span>
        <span />
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No email logs found.</div>
      ) : (
        <div className="divide-y divide-border">
          {logs.map((log) => (
            <div key={log.id}>
              <div
                className="grid md:grid-cols-[1fr_1fr_120px_140px_40px] gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors cursor-pointer items-center"
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${STATUS_CLASSES[log.status]}`}>
                    {STATUS_ICONS[log.status]}
                    {log.status}
                  </span>
                  <span className="text-foreground text-sm truncate">{log.to}</span>
                </div>
                <span className="text-muted-foreground text-sm truncate">{log.subject}</span>
                <span className="text-muted-foreground text-xs truncate">
                  {log.template?.name ?? log.templateName ?? <span className="italic">System</span>}
                </span>
                <span className="text-muted-foreground text-xs">
                  {new Date(log.sentAt).toLocaleString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(log.id); }}
                  className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {expandedId === log.id && (
                <div className="px-4 pb-3 text-xs text-muted-foreground space-y-1.5 bg-secondary/20 border-t border-border">
                  <div className="pt-2 grid grid-cols-2 gap-2">
                    {log.resendId && (
                      <div>
                        <span className="text-muted-foreground/60">Resend ID</span>
                        <p className="font-mono text-foreground/80">{log.resendId}</p>
                      </div>
                    )}
                    {log.error && (
                      <div className="col-span-2">
                        <span className="text-red-400">Error</span>
                        <p className="text-red-300/80 font-mono">{log.error}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-muted-foreground text-xs">{total} total</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pushParams({ page: String(page - 1) })}
              disabled={page <= 1}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-muted-foreground text-xs">{page} / {pages}</span>
            <button
              onClick={() => pushParams({ page: String(page + 1) })}
              disabled={page >= pages}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
