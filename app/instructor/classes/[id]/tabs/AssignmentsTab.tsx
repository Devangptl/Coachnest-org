"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ClipboardList,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Paperclip,
  Link as LinkIcon,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Send,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";

type AssignmentType = "TEXT" | "FILE" | "URL" | "QUIZ";
type AssignmentStatus = "DRAFT" | "PUBLISHED" | "CLOSED";
type SubmissionStatus = "DRAFT" | "SUBMITTED" | "GRADED" | "RETURNED";

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  type: AssignmentType;
  status: AssignmentStatus;
  maxScore: number;
  passingScore: number;
  weight: number;
  dueAt: string | null;
  publishAt: string | null;
  allowLate: boolean;
  latePenalty: number;
  maxAttempts: number;
  attachments: string[];
  createdAt: string;
  author: { id: string; name: string; avatar: string | null };
  _count: { submissions: number };
};

type Submission = {
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
  student: { id: string; name: string; avatar: string | null; email: string };
  grader: { id: string; name: string } | null;
};

const TYPE_ICON: Record<AssignmentType, React.ComponentType<{ className?: string }>> = {
  TEXT: FileText,
  FILE: Paperclip,
  URL: LinkIcon,
  QUIZ: HelpCircle,
};

const STATUS_STYLE: Record<AssignmentStatus, string> = {
  DRAFT: "bg-amber-500/15 text-amber-400 border-amber-400/30",
  PUBLISHED: "bg-emerald-500/15 text-emerald-400 border-emerald-400/30",
  CLOSED: "bg-secondary text-muted-foreground border-border",
};

export default function AssignmentsTab({ classId }: { classId: string }) {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [creating, setCreating] = useState(false);
  const [grading, setGrading] = useState<Assignment | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/classes/${classId}/assignments`);
      const d = await r.json();
      setItems(d.assignments ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [classId]); // eslint-disable-line

  async function togglePublish(a: Assignment) {
    const next: AssignmentStatus =
      a.status === "PUBLISHED" ? "CLOSED" : "PUBLISHED";
    try {
      const res = await fetch(
        `/api/classes/${classId}/assignments/${a.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        },
      );
      if (!res.ok) throw new Error();
      toast.success(next === "PUBLISHED" ? "Published" : "Closed");
      load();
    } catch {
      toast.error("Failed");
    }
  }

  async function remove(a: Assignment) {
    if (!confirm(`Delete "${a.title}"? Submissions will be lost.`)) return;
    try {
      const res = await fetch(
        `/api/classes/${classId}/assignments/${a.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error();
      toast.success("Deleted");
      load();
    } catch {
      toast.error("Failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-amber-400" />
            Assignments
          </h2>
          <p className="text-xs text-muted-foreground">
            Author homework, projects, and quizzes. Grade submissions inline.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)} className="shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New assignment</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        </div>
      ) : items.length === 0 ? (
        <div className="glass p-10 rounded-xl text-center text-sm text-muted-foreground">
          <ClipboardList className="w-10 h-10 text-amber-400/40 mx-auto mb-2" />
          No assignments yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((a) => {
            const Icon = TYPE_ICON[a.type];
            const overdue =
              a.dueAt && new Date(a.dueAt) < new Date() && a.status === "PUBLISHED";
            const open = expanded === a.id;
            return (
              <div key={a.id} className="glass rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpanded(open ? null : a.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/40 transition-colors"
                >
                  {open ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <Icon className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm truncate">{a.title}</span>
                      <span
                        className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${STATUS_STYLE[a.status]}`}
                      >
                        {a.status}
                      </span>
                      {overdue && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border bg-red-500/15 text-red-400 border-red-400/30">
                          past due
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span>{a.maxScore} pts</span>
                      <span>·</span>
                      <span>{a._count.submissions} submission{a._count.submissions === 1 ? "" : "s"}</span>
                      {a.dueAt && (
                        <>
                          <span>·</span>
                          <span>Due {new Date(a.dueAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>

                {open && (
                  <div className="px-4 pb-4 pt-1 border-t border-border space-y-3">
                    {a.description && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {a.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setGrading(a);
                        }}
                      >
                        Grade submissions ({a._count.submissions})
                      </Button>
                      <Button
                        size="sm"
                        variant={a.status === "PUBLISHED" ? "secondary" : "primary"}
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePublish(a);
                        }}
                      >
                        {a.status === "PUBLISHED" ? "Close" : "Publish"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(a);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(a);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <AssignmentDialog
          classId={classId}
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            load();
          }}
        />
      )}

      {grading && (
        <GradingDialog
          classId={classId}
          assignment={grading}
          onClose={() => setGrading(null)}
          onChanged={() => load()}
        />
      )}
    </div>
  );
}

// ─── Create / Edit dialog ─────────────────────────────────────────────────────

function AssignmentDialog({
  classId,
  initial,
  onClose,
  onSaved,
}: {
  classId: string;
  initial: Assignment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [type, setType] = useState<AssignmentType>(initial?.type ?? "TEXT");
  const [maxScore, setMaxScore] = useState(initial?.maxScore ?? 100);
  const [passingScore, setPassingScore] = useState(initial?.passingScore ?? 60);
  const [weight, setWeight] = useState(initial?.weight ?? 1);
  const [dueAt, setDueAt] = useState<string>(
    initial?.dueAt ? toLocalInput(initial.dueAt) : "",
  );
  const [allowLate, setAllowLate] = useState(initial?.allowLate ?? true);
  const [latePenalty, setLatePenalty] = useState(initial?.latePenalty ?? 0);
  const [maxAttempts, setMaxAttempts] = useState(initial?.maxAttempts ?? 1);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (passingScore > maxScore) {
      toast.error("Passing score cannot exceed max score");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title,
        description: description || null,
        instructions: instructions || null,
        type,
        maxScore,
        passingScore,
        weight,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        allowLate,
        latePenalty,
        maxAttempts,
      };
      const url = initial
        ? `/api/classes/${classId}/assignments/${initial.id}`
        : `/api/classes/${classId}/assignments`;
      const res = await fetch(url, {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed");
      }
      toast.success(initial ? "Updated" : "Created");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Edit assignment" : "New assignment"}
          </DialogTitle>
          <DialogDescription>
            Set the work students should complete, grading rules, and deadline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Title">
            <input
              className="input-glass"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Week 3 reading response"
            />
          </Field>

          <Field label="Short description">
            <textarea
              className="input-glass min-h-[60px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A one-line summary shown in the list"
            />
          </Field>

          <Field label="Instructions">
            <textarea
              className="input-glass min-h-[100px]"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Detailed instructions, rubric, expected deliverables..."
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Submission type">
              <select
                className="input-glass"
                value={type}
                onChange={(e) => setType(e.target.value as AssignmentType)}
              >
                <option value="TEXT">Text response</option>
                <option value="FILE">File upload</option>
                <option value="URL">Link / URL</option>
              </select>
            </Field>
            <Field label="Due date">
              <input
                type="datetime-local"
                className="input-glass"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Field label="Max score">
              <input
                type="number"
                min={1}
                className="input-glass"
                value={maxScore}
                onChange={(e) => setMaxScore(parseInt(e.target.value) || 0)}
              />
            </Field>
            <Field label="Passing score">
              <input
                type="number"
                min={0}
                className="input-glass"
                value={passingScore}
                onChange={(e) => setPassingScore(parseInt(e.target.value) || 0)}
              />
            </Field>
            <Field label="Weight">
              <input
                type="number"
                min={1}
                className="input-glass"
                value={weight}
                onChange={(e) => setWeight(parseInt(e.target.value) || 1)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Max attempts (0 = unlimited)">
              <input
                type="number"
                min={0}
                className="input-glass"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 0)}
              />
            </Field>
            <Field label="Late penalty (% per day)">
              <input
                type="number"
                min={0}
                max={100}
                className="input-glass"
                value={latePenalty}
                onChange={(e) => setLatePenalty(parseInt(e.target.value) || 0)}
                disabled={!allowLate}
              />
            </Field>
          </div>

          <Checkbox
            label="Allow late submissions"
            checked={allowLate}
            onChange={setAllowLate}
          />
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} loading={busy}>
            {initial ? "Save changes" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground block mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}

// ─── Grading dialog ───────────────────────────────────────────────────────────

function GradingDialog({
  classId,
  assignment,
  onClose,
  onChanged,
}: {
  classId: string;
  assignment: Assignment;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Submission | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/classes/${classId}/assignments/${assignment.id}/submissions`,
      );
      const d = await r.json();
      setSubs(d.submissions ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [assignment.id]); // eslint-disable-line

  const pending = useMemo(
    () => subs.filter((s) => s.status === "SUBMITTED").length,
    [subs],
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{assignment.title}</DialogTitle>
          <DialogDescription>
            {pending} pending · {subs.length} total · max {assignment.maxScore} pts
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center">
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          </div>
        ) : subs.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No submissions yet.
          </div>
        ) : active ? (
          <SubmissionGrader
            classId={classId}
            assignment={assignment}
            submission={active}
            onBack={() => {
              setActive(null);
              load();
              onChanged();
            }}
          />
        ) : (
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {subs.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary text-left transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm">{s.student.name}</span>
                    <SubmissionBadge s={s} />
                    {s.isLate && (
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border bg-red-500/15 text-red-400 border-red-400/30">
                        late
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Attempt {s.attempt}
                    {s.submittedAt && ` · ${new Date(s.submittedAt).toLocaleString()}`}
                    {s.score !== null && ` · ${s.score}/${assignment.maxScore}`}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SubmissionBadge({ s }: { s: Submission }) {
  const cls = {
    DRAFT: "bg-secondary text-muted-foreground border-border",
    SUBMITTED: "bg-sky-500/15 text-sky-400 border-sky-400/30",
    GRADED: "bg-emerald-500/15 text-emerald-400 border-emerald-400/30",
    RETURNED: "bg-violet-500/15 text-violet-400 border-violet-400/30",
  }[s.status];
  return (
    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${cls}`}>
      {s.status}
    </span>
  );
}

function SubmissionGrader({
  classId,
  assignment,
  submission,
  onBack,
}: {
  classId: string;
  assignment: Assignment;
  submission: Submission;
  onBack: () => void;
}) {
  const [score, setScore] = useState<number>(
    submission.score ?? Math.round(assignment.maxScore * 0.8),
  );
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [busy, setBusy] = useState(false);
  const [returnRevision, setReturnRevision] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/classes/${classId}/assignments/${assignment.id}/submissions/${submission.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score,
            feedback: feedback || null,
            returnForRevision: returnRevision,
          }),
        },
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed");
      }
      toast.success(returnRevision ? "Returned for revision" : "Graded");
      onBack();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={onBack}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← Back to all submissions
      </button>

      <div className="glass p-3 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-sm">{submission.student.name}</span>
          <SubmissionBadge s={submission} />
          {submission.isLate && (
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border bg-red-500/15 text-red-400 border-red-400/30">
              late
            </span>
          )}
        </div>
        <SubmissionContent submission={submission} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={`Score (out of ${assignment.maxScore})`}>
          <input
            type="number"
            min={0}
            max={assignment.maxScore}
            className="input-glass"
            value={score}
            onChange={(e) => setScore(parseInt(e.target.value) || 0)}
          />
        </Field>
        <div className="flex items-end">
          <div className="text-sm text-muted-foreground">
            {score >= assignment.passingScore ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Passing
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Below passing ({assignment.passingScore})
              </span>
            )}
          </div>
        </div>
      </div>

      <Field label="Feedback">
        <textarea
          className="input-glass min-h-[100px]"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="What did they do well? What should they improve?"
        />
      </Field>

      <Checkbox
        label="Return for revision (let student resubmit)"
        checked={returnRevision}
        onChange={setReturnRevision}
      />

      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onBack}>
          Cancel
        </Button>
        <Button size="sm" onClick={save} loading={busy}>
          <Send className="w-4 h-4" />
          {returnRevision ? "Return for revision" : "Submit grade"}
        </Button>
      </div>
    </div>
  );
}

function SubmissionContent({ submission }: { submission: Submission }) {
  return (
    <div className="space-y-2 text-sm">
      {submission.textBody && (
        <div className="whitespace-pre-wrap text-muted-foreground">
          {submission.textBody}
        </div>
      )}
      {submission.url && (
        <a
          href={submission.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-amber-400 hover:underline"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          {submission.url}
        </a>
      )}
      {submission.fileUrls.length > 0 && (
        <div className="space-y-1">
          {submission.fileUrls.map((u) => (
            <a
              key={u}
              href={u}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-amber-400 hover:underline"
            >
              <Paperclip className="w-3.5 h-3.5" />
              {u.split("/").pop()}
            </a>
          ))}
        </div>
      )}
      {!submission.textBody &&
        !submission.url &&
        submission.fileUrls.length === 0 && (
          <p className="text-muted-foreground italic">(empty submission)</p>
        )}
    </div>
  );
}
