/**
 * /admin/demo-requests — Demo request pipeline for the sales/support team
 */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  Globe,
  Inbox,
  Link2,
  Loader2,
  Mail,
  MonitorPlay,
  Phone,
  PhoneCall,
  Save,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/UIDialogProvider";

interface DemoRequest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  organization: string;
  jobTitle: string | null;
  teamSize: string | null;
  interests: string[];
  preferredDate: string | null;
  preferredTimeSlot: string | null;
  timezone: string | null;
  message: string | null;
  status: string;
  scheduledAt: string | null;
  meetingLink: string | null;
  adminNotes: string | null;
  createdAt: string;
}

interface StatusCounts {
  ALL: number;
  PENDING: number;
  CONTACTED: number;
  SCHEDULED: number;
  COMPLETED: number;
  CANCELLED: number;
}

const TABS = ["ALL", "PENDING", "CONTACTED", "SCHEDULED", "COMPLETED", "CANCELLED"] as const;

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-orange-500/15 text-orange-300 border-[#d97757]/25",
  CONTACTED: "bg-blue-500/15 text-blue-300 border-blue-400/25",
  SCHEDULED: "bg-purple-500/15 text-purple-300 border-purple-400/25",
  COMPLETED: "bg-green-500/15 text-green-400 border-green-400/25",
  CANCELLED: "bg-red-500/15 text-red-400 border-red-400/25",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  PENDING: <Clock className="w-3 h-3" />,
  CONTACTED: <PhoneCall className="w-3 h-3" />,
  SCHEDULED: <CalendarClock className="w-3 h-3" />,
  COMPLETED: <CheckCircle2 className="w-3 h-3" />,
  CANCELLED: <XCircle className="w-3 h-3" />,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatScheduled(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export default function AdminDemoRequestsPage() {
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [counts, setCounts] = useState<StatusCounts>({
    ALL: 0, PENDING: 0, CONTACTED: 0, SCHEDULED: 0, COMPLETED: 0, CANCELLED: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState<DemoRequest | null>(null);
  const confirm = useConfirm();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== "ALL") params.set("status", activeTab);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/demo-requests?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRequests(data.requests);
      setCounts(data.statusCounts);
    } catch {
      toast.error("Failed to load demo requests");
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function patchRequest(id: string, body: Record<string, unknown>, successMsg: string) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/demo-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Update failed");
        return false;
      }
      toast.success(successMsg);
      fetchRequests();
      return true;
    } catch {
      toast.error("Network error");
      return false;
    } finally {
      setUpdating(null);
    }
  }

  async function handleDelete(id: string) {
    if (!await confirm("Delete this demo request permanently?", { title: "Delete Demo Request", confirmText: "Delete" })) return;
    setUpdating(id);
    try {
      const res = await fetch(`/api/demo-requests/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Demo request deleted");
      fetchRequests();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-orange-500/15 border border-[#d97757]/25 flex items-center justify-center">
              <MonitorPlay className="w-5 h-5 text-[#d97757]" />
            </div>
            Demo Requests
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            {counts.PENDING > 0 && (
              <span className="text-[#d97757] font-semibold">{counts.PENDING} pending · </span>
            )}
            {counts.SCHEDULED > 0 && (
              <span className="text-purple-400 font-semibold">{counts.SCHEDULED} scheduled · </span>
            )}
            {counts.ALL} total request{counts.ALL !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col xl:flex-row gap-4 mb-6">
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap",
                activeTab === tab
                  ? "bg-orange-500/15 text-[#d97757] border border-[#d97757]/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {tab}
              {tab !== "ALL" && (
                <span className="text-[10px] opacity-70">
                  {counts[tab as keyof StatusCounts]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or organization..."
            className="input-glass pl-9 py-2 text-sm"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="glass p-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#d97757]" />
          <span className="ml-3 text-muted-foreground text-sm">Loading demo requests...</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="glass text-center py-20">
          <Inbox className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-foreground font-semibold text-lg mb-2">No demo requests found</p>
          <p className="text-muted-foreground text-sm">
            {search ? "No requests match your search." : "Demo requests will appear here when visitors submit the form."}
          </p>
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <div className="divide-y divide-border/50">
            <AnimatePresence mode="popLayout">
              {requests.map((req) => {
                const isExpanded = expanded === req.id;
                const busy = updating === req.id;
                return (
                  <motion.div
                    key={req.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={cn(req.status === "PENDING" && "bg-orange-500/[.03]")}
                  >
                    {/* Row */}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : req.id)}
                      className="w-full text-left grid grid-cols-2 md:grid-cols-12 gap-3 md:gap-4 items-center px-5 py-4 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="col-span-2 md:col-span-3 min-w-0">
                        <p className={cn("text-sm truncate", req.status === "PENDING" ? "text-foreground font-semibold" : "text-foreground font-medium")}>
                          {req.name}
                        </p>
                        <p className="text-muted-foreground text-xs truncate">{req.email}</p>
                      </div>
                      <div className="md:col-span-3 min-w-0">
                        <p className="text-muted-foreground text-sm truncate flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                          {req.organization}
                        </p>
                        {req.teamSize && (
                          <p className="text-muted-foreground/60 text-xs truncate mt-0.5">{req.teamSize} people</p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <span className={cn("badge border", STATUS_BADGE[req.status])}>
                          {STATUS_ICON[req.status]}
                          {req.status}
                        </span>
                      </div>
                      <div className="md:col-span-3 min-w-0">
                        {req.status === "SCHEDULED" && req.scheduledAt ? (
                          <p className="text-purple-300 text-xs flex items-center gap-1.5 truncate">
                            <CalendarClock className="w-3.5 h-3.5 flex-shrink-0" />
                            {formatScheduled(req.scheduledAt)}
                          </p>
                        ) : (
                          <p className="text-muted-foreground text-sm">{timeAgo(req.createdAt)}</p>
                        )}
                      </div>
                      <div className="hidden md:flex md:col-span-1 justify-end">
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 text-muted-foreground transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </div>
                    </button>

                    {/* Expanded detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <DemoRequestDetail
                            request={req}
                            busy={busy}
                            onMarkContacted={() =>
                              patchRequest(req.id, { status: "CONTACTED" }, "Marked as contacted")
                            }
                            onSchedule={() => setScheduling(req)}
                            onComplete={() =>
                              patchRequest(req.id, { status: "COMPLETED" }, "Marked as completed")
                            }
                            onCancel={() =>
                              patchRequest(req.id, { status: "CANCELLED" }, "Request cancelled")
                            }
                            onDelete={() => handleDelete(req.id)}
                            onSaveNotes={(notes) =>
                              patchRequest(req.id, { adminNotes: notes }, "Notes saved")
                            }
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Schedule modal */}
      <AnimatePresence>
        {scheduling && (
          <ScheduleModal
            request={scheduling}
            onClose={() => setScheduling(null)}
            onSchedule={async (scheduledAt, meetingLink) => {
              const ok = await patchRequest(
                scheduling.id,
                {
                  status: "SCHEDULED",
                  scheduledAt,
                  meetingLink: meetingLink || null,
                },
                "Demo scheduled — confirmation email sent"
              );
              if (ok) setScheduling(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Expanded detail panel ───────────────────────────────────────────────────

function DemoRequestDetail({
  request: req,
  busy,
  onMarkContacted,
  onSchedule,
  onComplete,
  onCancel,
  onDelete,
  onSaveNotes,
}: {
  request: DemoRequest;
  busy: boolean;
  onMarkContacted: () => void;
  onSchedule: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onSaveNotes: (notes: string) => void;
}) {
  const [notes, setNotes] = useState(req.adminNotes ?? "");
  const isOpen = ["PENDING", "CONTACTED", "SCHEDULED"].includes(req.status);

  return (
    <div className="px-5 pb-5 pt-1 border-t border-border/40 bg-secondary/10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4">
        {/* Left: details */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <DetailItem icon={<Mail className="w-3.5 h-3.5" />} label="Email">
              <a href={`mailto:${req.email}`} className="text-orange-400 hover:underline break-all">
                {req.email}
              </a>
            </DetailItem>
            {req.phone && (
              <DetailItem icon={<Phone className="w-3.5 h-3.5" />} label="Phone">
                {req.phone}
              </DetailItem>
            )}
            {req.jobTitle && (
              <DetailItem icon={<Users className="w-3.5 h-3.5" />} label="Role">
                {req.jobTitle}
              </DetailItem>
            )}
            {req.preferredDate && (
              <DetailItem icon={<Calendar className="w-3.5 h-3.5" />} label="Preferred date">
                {new Date(req.preferredDate).toLocaleDateString(undefined, { timeZone: "UTC", dateStyle: "medium" })}
                {req.preferredTimeSlot ? ` · ${req.preferredTimeSlot}` : ""}
              </DetailItem>
            )}
            {req.timezone && (
              <DetailItem icon={<Globe className="w-3.5 h-3.5" />} label="Timezone">
                {req.timezone}
              </DetailItem>
            )}
            {req.meetingLink && (
              <DetailItem icon={<Link2 className="w-3.5 h-3.5" />} label="Meeting link">
                <a href={req.meetingLink} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline break-all">
                  {req.meetingLink}
                </a>
              </DetailItem>
            )}
          </div>

          {req.interests.length > 0 && (
            <div>
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Interested in
              </p>
              <div className="flex flex-wrap gap-1.5">
                {req.interests.map((i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-[11px] bg-orange-500/10 border border-[#d97757]/20 text-orange-300">
                    {i}
                  </span>
                ))}
              </div>
            </div>
          )}

          {req.message && (
            <div>
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1.5">Message</p>
              <p className="text-foreground/90 text-sm whitespace-pre-wrap bg-secondary/30 border border-border/50 rounded-lg p-3">
                {req.message}
              </p>
            </div>
          )}
        </div>

        {/* Right: notes + actions */}
        <div className="space-y-3">
          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1.5">Internal notes</p>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes for your team (not visible to the requester)..."
              className="input-glass text-sm resize-none"
            />
            <button
              onClick={() => onSaveNotes(notes)}
              disabled={busy || notes === (req.adminNotes ?? "")}
              className="btn-secondary text-xs px-3 py-1.5 mt-2 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              Save Notes
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {req.status === "PENDING" && (
              <button onClick={onMarkContacted} disabled={busy} className="btn-secondary text-xs px-3 py-1.5">
                <PhoneCall className="w-3.5 h-3.5" />
                Mark Contacted
              </button>
            )}
            {isOpen && (
              <button onClick={onSchedule} disabled={busy} className="btn-primary text-xs px-3 py-1.5">
                <CalendarClock className="w-3.5 h-3.5" />
                {req.status === "SCHEDULED" ? "Reschedule" : "Schedule Demo"}
              </button>
            )}
            {req.status === "SCHEDULED" && (
              <button onClick={onComplete} disabled={busy} className="btn-secondary text-xs px-3 py-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark Completed
              </button>
            )}
            {isOpen && (
              <button onClick={onCancel} disabled={busy} className="btn-ghost text-xs px-3 py-1.5">
                <XCircle className="w-3.5 h-3.5" />
                Cancel
              </button>
            )}
            <button onClick={onDelete} disabled={busy} className="btn-danger text-xs px-2.5 py-1.5 ml-auto">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
        {icon} {label}
      </p>
      <div className="text-foreground/90 text-sm">{children}</div>
    </div>
  );
}

// ─── Schedule modal ──────────────────────────────────────────────────────────

function ScheduleModal({
  request,
  onClose,
  onSchedule,
}: {
  request: DemoRequest;
  onClose: () => void;
  onSchedule: (scheduledAtIso: string, meetingLink: string) => Promise<void>;
}) {
  const [dateTime, setDateTime] = useState(() =>
    request.scheduledAt ? toLocalInputValue(request.scheduledAt) : ""
  );
  const [meetingLink, setMeetingLink] = useState(request.meetingLink ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dateTime) {
      toast.error("Pick a date and time");
      return;
    }
    if (meetingLink && !/^https?:\/\//.test(meetingLink)) {
      toast.error("Meeting link must start with http(s)://");
      return;
    }
    setSaving(true);
    try {
      await onSchedule(new Date(dateTime).toISOString(), meetingLink.trim());
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.form
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-card border border-border rounded-xl shadow-glass p-6 space-y-5"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-[#d97757]" />
              Schedule Demo
            </h3>
            <p className="text-muted-foreground text-xs mt-1">
              {request.name} · {request.organization}
              {request.timezone && ` · prefers ${request.timezone}`}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {(request.preferredDate || request.preferredTimeSlot) && (
          <div className="rounded-lg bg-orange-500/5 border border-orange-500/20 px-3 py-2.5 text-xs text-muted-foreground">
            <span className="text-orange-400 font-semibold">Requested: </span>
            {request.preferredDate &&
              new Date(request.preferredDate).toLocaleDateString(undefined, { timeZone: "UTC", dateStyle: "medium" })}
            {request.preferredDate && request.preferredTimeSlot && " · "}
            {request.preferredTimeSlot}
          </div>
        )}

        <div>
          <label htmlFor="schedule-datetime" className="label">
            Date &amp; Time <span className="text-red-400">*</span>
          </label>
          <input
            id="schedule-datetime"
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            className="input-glass"
          />
        </div>

        <div>
          <label htmlFor="schedule-link" className="label">
            Meeting Link <span className="text-muted-foreground text-xs">(optional)</span>
          </label>
          <input
            id="schedule-link"
            type="url"
            placeholder="https://meet.google.com/..."
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            className="input-glass"
          />
        </div>

        <p className="text-muted-foreground text-xs">
          Saving sends a confirmation email with these details to {request.email}.
        </p>

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2.5">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
            Confirm
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
