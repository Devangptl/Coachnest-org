"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Paperclip,
  Link as LinkIcon,
  HelpCircle,
  ChevronRight,
  ArrowLeft,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { supabaseClient } from "@/lib/supabase/client";
import { channels, events } from "@/lib/realtime/channels";

type AssignmentType = "TEXT" | "FILE" | "URL" | "QUIZ";
type SubmissionStatus = "DRAFT" | "SUBMITTED" | "GRADED" | "RETURNED";

type StudentSubmission = {
  id: string;
  status: SubmissionStatus;
  score: number | null;
  submittedAt: string | null;
  attempt: number;
  isLate: boolean;
  gradedAt: string | null;
};

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  type: AssignmentType;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  maxScore: number;
  passingScore: number;
  weight: number;
  dueAt: string | null;
  allowLate: boolean;
  latePenalty: number;
  maxAttempts: number;
  attachments: string[];
  author: { id: string; name: string; avatar: string | null };
  submissions: StudentSubmission[];
};

const TYPE_ICON: Record<AssignmentType, React.ComponentType<{ className?: string }>> = {
  TEXT: FileText,
  FILE: Paperclip,
  URL: LinkIcon,
  QUIZ: HelpCircle,
};

export default function StudentAssignmentsPanel({ classId }: { classId: string }) {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Assignment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/classes/${classId}/assignments`);
      const d = await r.json();
      setItems(d.assignments ?? []);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => { load(); }, [load]);

  // Realtime: refresh when instructor publishes or grades.
  useEffect(() => {
    const sb = supabaseClient;
    const ch = sb.channel(channels.classAssignments(classId));
    ch.on("broadcast", { event: events.classAssignmentPublished }, () => load())
      .on("broadcast", { event: events.classAssignmentGraded }, () => load())
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [classId, load]);

  if (active) {
    return (
      <AssignmentDetail
        classId={classId}
        assignment={active}
        onBack={() => { setActive(null); load(); }}
      />
    );
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground text-center py-6">Loading…</div>;
  }
  if (items.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground">
        <ClipboardList className="w-10 h-10 text-amber-400/40 mx-auto mb-2" />
        No assignments yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((a) => {
        const Icon = TYPE_ICON[a.type];
        const latest = a.submissions[0];
        const status = computeStudentStatus(a, latest);
        return (
          <button
            key={a.id}
            onClick={() => setActive(a)}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary hover:bg-secondary/60 transition-colors text-left"
          >
            <Icon className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="font-medium text-sm">{a.title}</span>
                <StatusPill status={status} />
              </div>
              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span>{a.maxScore} pts</span>
                {a.dueAt && (
                  <span>
                    Due {new Date(a.dueAt).toLocaleDateString()}{" "}
                    {new Date(a.dueAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
                {latest?.score !== null && latest?.score !== undefined && (
                  <span className="text-foreground font-medium">
                    {latest.score} / {a.maxScore}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        );
      })}
    </div>
  );
}

type DisplayStatus =
  | "NOT_STARTED"
  | "DRAFT"
  | "SUBMITTED"
  | "GRADED_PASS"
  | "GRADED_FAIL"
  | "RETURNED"
  | "OVERDUE"
  | "CLOSED";

function computeStudentStatus(
  a: Assignment,
  latest: StudentSubmission | undefined,
): DisplayStatus {
  if (a.status === "CLOSED" && !latest) return "CLOSED";
  if (!latest) {
    if (a.dueAt && new Date(a.dueAt) < new Date()) return "OVERDUE";
    return "NOT_STARTED";
  }
  if (latest.status === "DRAFT") return "DRAFT";
  if (latest.status === "SUBMITTED") return "SUBMITTED";
  if (latest.status === "RETURNED") return "RETURNED";
  if (latest.status === "GRADED") {
    return (latest.score ?? 0) >= a.passingScore ? "GRADED_PASS" : "GRADED_FAIL";
  }
  return "NOT_STARTED";
}

function StatusPill({ status }: { status: DisplayStatus }) {
  const map: Record<DisplayStatus, { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
    NOT_STARTED: {
      label: "Not started",
      cls: "bg-secondary text-muted-foreground border-border",
      Icon: Clock,
    },
    DRAFT: {
      label: "Draft",
      cls: "bg-amber-500/15 text-amber-400 border-amber-400/30",
      Icon: FileText,
    },
    SUBMITTED: {
      label: "Submitted",
      cls: "bg-sky-500/15 text-sky-400 border-sky-400/30",
      Icon: CheckCircle2,
    },
    GRADED_PASS: {
      label: "Passed",
      cls: "bg-emerald-500/15 text-emerald-400 border-emerald-400/30",
      Icon: CheckCircle2,
    },
    GRADED_FAIL: {
      label: "Below passing",
      cls: "bg-red-500/15 text-red-400 border-red-400/30",
      Icon: AlertCircle,
    },
    RETURNED: {
      label: "Revise",
      cls: "bg-violet-500/15 text-violet-400 border-violet-400/30",
      Icon: AlertCircle,
    },
    OVERDUE: {
      label: "Overdue",
      cls: "bg-red-500/15 text-red-400 border-red-400/30",
      Icon: AlertCircle,
    },
    CLOSED: {
      label: "Closed",
      cls: "bg-secondary text-muted-foreground border-border",
      Icon: Clock,
    },
  };
  const { label, cls, Icon } = map[status];
  return (
    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ─── Detail / submission view ─────────────────────────────────────────────────

function AssignmentDetail({
  classId,
  assignment,
  onBack,
}: {
  classId: string;
  assignment: Assignment;
  onBack: () => void;
}) {
  const [mySubs, setMySubs] = useState<Array<{
    id: string;
    status: SubmissionStatus;
    attempt: number;
    textBody: string | null;
    fileUrls: string[];
    url: string | null;
    submittedAt: string | null;
    score: number | null;
    feedback: string | null;
    gradedAt: string | null;
    isLate: boolean;
    grader: { id: string; name: string } | null;
  }>>([]);
  const [textBody, setTextBody] = useState("");
  const [url, setUrl] = useState("");
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [newFileUrl, setNewFileUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const loadMine = useCallback(async () => {
    const r = await fetch(
      `/api/classes/${classId}/assignments/${assignment.id}/me`,
    );
    const d = await r.json();
    setMySubs(d.submissions ?? []);
    // Pre-fill workspace from latest editable submission.
    const editable = (d.submissions ?? []).find(
      (s: { status: SubmissionStatus }) =>
        s.status === "DRAFT" || s.status === "RETURNED",
    );
    if (editable) {
      setTextBody(editable.textBody ?? "");
      setUrl(editable.url ?? "");
      setFileUrls(editable.fileUrls ?? []);
    } else {
      setTextBody("");
      setUrl("");
      setFileUrls([]);
    }
  }, [classId, assignment.id]);

  useEffect(() => { loadMine(); }, [loadMine]);

  const latest = mySubs[0];
  const finalizedAttempts = mySubs.filter(
    (s) => s.status === "SUBMITTED" || s.status === "GRADED",
  ).length;
  const remaining =
    assignment.maxAttempts === 0
      ? Infinity
      : assignment.maxAttempts - finalizedAttempts;

  const overdue =
    !!assignment.dueAt && new Date(assignment.dueAt) < new Date();
  const canSubmit =
    assignment.status === "PUBLISHED" &&
    remaining > 0 &&
    (!overdue || assignment.allowLate) &&
    (!latest || latest.status === "DRAFT" || latest.status === "RETURNED");

  async function submit(finalize: boolean) {
    if (!textBody.trim() && !url.trim() && fileUrls.length === 0 && finalize) {
      toast.error("Add a response before submitting");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/classes/${classId}/assignments/${assignment.id}/submissions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            textBody: textBody || null,
            url: url || null,
            fileUrls,
            finalize,
          }),
        },
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed");
      }
      toast.success(finalize ? "Submitted!" : "Draft saved");
      loadMine();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function addFile() {
    if (!newFileUrl.trim()) return;
    try {
      new URL(newFileUrl);
    } catch {
      toast.error("Enter a valid URL");
      return;
    }
    setFileUrls((p) => [...p, newFileUrl.trim()]);
    setNewFileUrl("");
  }

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ArrowLeft className="w-3 h-3" /> Back to assignments
      </button>

      <div>
        <h3 className="font-semibold text-base mb-1">{assignment.title}</h3>
        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3">
          <span>{assignment.maxScore} pts</span>
          {assignment.dueAt && (
            <span>
              Due {new Date(assignment.dueAt).toLocaleString()}
              {overdue && " (past due)"}
            </span>
          )}
          <span>
            Attempt {finalizedAttempts + (latest?.status === "DRAFT" || latest?.status === "RETURNED" ? 1 : finalizedAttempts === 0 ? 1 : finalizedAttempts + 1)}
            {assignment.maxAttempts > 0 && ` of ${assignment.maxAttempts}`}
          </span>
        </div>
      </div>

      {assignment.description && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {assignment.description}
        </p>
      )}

      {assignment.instructions && (
        <div className="glass p-3 rounded-lg">
          <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
            Instructions
          </div>
          <div className="text-sm whitespace-pre-wrap">
            {assignment.instructions}
          </div>
        </div>
      )}

      {/* Latest graded result */}
      {latest && (latest.status === "GRADED" || latest.status === "RETURNED") && (
        <div className="glass p-3 rounded-lg space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {latest.status === "GRADED" ? "Result" : "Returned for revision"}
            </span>
            {latest.score !== null && (
              <span
                className={`text-sm font-semibold ${
                  latest.score >= assignment.passingScore
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {latest.score} / {assignment.maxScore}
              </span>
            )}
            {latest.isLate && (
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border bg-red-500/15 text-red-400 border-red-400/30">
                late
              </span>
            )}
          </div>
          {latest.feedback && (
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
              {latest.feedback}
            </p>
          )}
        </div>
      )}

      {/* Submission workspace */}
      {canSubmit ? (
        <div className="space-y-3">
          {(assignment.type === "TEXT" || assignment.type === "FILE" || assignment.type === "URL") && (
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground block mb-1">
                Your response
              </span>
              <textarea
                className="input-glass min-h-[140px]"
                value={textBody}
                onChange={(e) => setTextBody(e.target.value)}
                placeholder="Write your response here…"
              />
            </label>
          )}

          {assignment.type === "URL" && (
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground block mb-1">
                Link
              </span>
              <input
                className="input-glass"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/you/your-project"
              />
            </label>
          )}

          {assignment.type === "FILE" && (
            <div>
              <span className="text-xs font-medium text-muted-foreground block mb-1">
                Attachments
              </span>
              <div className="flex gap-2 mb-2">
                <input
                  className="input-glass flex-1"
                  type="url"
                  value={newFileUrl}
                  onChange={(e) => setNewFileUrl(e.target.value)}
                  placeholder="Paste a file URL (Google Drive, Dropbox, etc.)"
                />
                <Button size="sm" variant="secondary" type="button" onClick={addFile}>
                  Add
                </Button>
              </div>
              {fileUrls.length > 0 && (
                <ul className="text-xs space-y-1">
                  {fileUrls.map((u, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Paperclip className="w-3 h-3 text-muted-foreground" />
                      <span className="flex-1 truncate">{u}</span>
                      <button
                        onClick={() =>
                          setFileUrls((p) => p.filter((_, j) => j !== i))
                        }
                        className="text-muted-foreground hover:text-red-400"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => submit(false)}
              loading={busy}
            >
              Save draft
            </Button>
            <Button size="sm" onClick={() => submit(true)} loading={busy}>
              <Send className="w-4 h-4" /> Submit
            </Button>
          </div>
        </div>
      ) : latest?.status === "SUBMITTED" ? (
        <div className="glass p-4 rounded-lg text-sm text-muted-foreground">
          Submitted on{" "}
          {latest.submittedAt
            ? new Date(latest.submittedAt).toLocaleString()
            : "—"}
          . Waiting for the instructor to grade.
        </div>
      ) : remaining <= 0 ? (
        <div className="glass p-4 rounded-lg text-sm text-muted-foreground">
          No attempts remaining.
        </div>
      ) : assignment.status === "CLOSED" ? (
        <div className="glass p-4 rounded-lg text-sm text-muted-foreground">
          Submissions are closed.
        </div>
      ) : (
        <div className="glass p-4 rounded-lg text-sm text-muted-foreground">
          This assignment cannot be submitted right now.
        </div>
      )}

      {mySubs.length > 1 && (
        <details className="glass rounded-lg">
          <summary className="cursor-pointer p-3 text-xs font-medium">
            Previous attempts ({mySubs.length - 1})
          </summary>
          <ul className="px-3 pb-3 space-y-1 text-xs">
            {mySubs.slice(1).map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <span>Attempt {s.attempt}</span>
                <span>·</span>
                <span>{s.status}</span>
                {s.score !== null && (
                  <span className="text-foreground">
                    · {s.score}/{assignment.maxScore}
                  </span>
                )}
                {s.submittedAt && (
                  <span>· {new Date(s.submittedAt).toLocaleDateString()}</span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
