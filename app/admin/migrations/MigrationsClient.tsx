"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Database,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/UIDialogProvider";

interface Status {
  runnerEnabled: boolean;
  historyAvailable: boolean;
  diskAvailable: boolean;
  applied: { name: string; finishedAt: string | null }[];
  pending: string[];
  failed: { name: string; startedAt: string | null }[];
  orphans: { name: string; finishedAt: string | null; failed: boolean }[];
}

const CONFIRM_PHRASE = "CONFIRM";

export default function MigrationsClient() {
  const confirm = useConfirm();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [output, setOutput] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/migrations");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStatus(data.status);
    } catch {
      toast.error("Failed to load migration status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function deploy() {
    if (!status) return;
    const ok = await confirm(
      `This will run "prisma migrate deploy" against the live database and apply ${status.pending.length} pending migration(s). This cannot be undone. Continue?`,
      { title: "Apply database migrations", confirmText: "Run deploy" },
    );
    if (!ok) return;

    setRunning(true);
    setOutput(null);
    try {
      const res = await fetch("/api/admin/migrations/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: CONFIRM_PHRASE }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOutput(data.error || "Migration failed");
        toast.error("Migration failed");
        return;
      }
      setOutput(data.output || "Done.");
      toast.success(
        `Applied ${data.pendingBefore - data.pendingAfter} migration(s)`,
      );
      setConfirmText("");
    } catch {
      toast.error("Request failed");
    } finally {
      setRunning(false);
      load();
    }
  }

  // In serverless/prod the migration files often aren't bundled, so we can't
  // know the pending count — only block on "nothing to apply" when we can
  // actually read the files on disk. `migrate deploy` is idempotent anyway.
  const knownUpToDate =
    !!status && status.diskAvailable && status.pending.length === 0;

  const disabledReasons: string[] = [];
  if (status) {
    if (status.failed.length > 0)
      disabledReasons.push("a migration is in a failed state — resolve it first");
    if (knownUpToDate)
      disabledReasons.push("schema is already up to date — nothing to apply");
    if (confirmText.trim() !== CONFIRM_PHRASE)
      disabledReasons.push(`type ${CONFIRM_PHRASE} (exactly, nothing else) to confirm`);
  }

  const canDeploy =
    !!status &&
    status.runnerEnabled &&
    status.failed.length === 0 &&
    !knownUpToDate &&
    confirmText.trim() === CONFIRM_PHRASE &&
    !running;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="w-6 h-6 text-orange-500" /> Database Migrations
        </h1>
        <Button
          size="sm"
          variant="secondary"
          onClick={load}
          disabled={loading || running}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        View applied and pending Prisma migrations. The runner only ever executes{" "}
        <code className="text-orange-400">prisma migrate deploy</code> — it never
        generates, resets, or runs arbitrary SQL.
      </p>

      {loading || !status ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat
              icon={CheckCircle2}
              label="Applied"
              value={status.applied.length}
              tone="emerald"
            />
            <Stat
              icon={Clock}
              label="Pending"
              value={status.pending.length}
              tone="amber"
            />
            <Stat
              icon={AlertTriangle}
              label="Failed"
              value={status.failed.length}
              tone="red"
            />
          </div>

          {/* Environment notices */}
          {!status.historyAvailable && (
            <Notice tone="amber">
              No <code>_prisma_migrations</code> table found — this database has
              no migration history (it may be managed via <code>db push</code>).
            </Notice>
          )}
          {!status.diskAvailable && (
            <Notice tone="amber">
              Migration files aren&apos;t readable at runtime in this
              deployment, so the pending list may be incomplete.
            </Notice>
          )}
          {status.failed.length > 0 && (
            <Notice tone="red">
              One or more migrations are in a failed/rolled-back state. Resolve
              them via your terminal before deploying — the runner is blocked
              until then.
            </Notice>
          )}
          {status.orphans.length > 0 && (
            <Notice tone="amber">
              {status.orphans.length} row(s) in <code>_prisma_migrations</code>{" "}
              don&apos;t match any migration file on disk — likely baselined or
              renamed migrations. They&apos;re shown below for visibility and
              don&apos;t block deploys.
            </Notice>
          )}

          {/* Pending */}
          <Section title={`Pending (${status.pending.length})`}>
            {status.pending.length === 0 ? (
              <Empty>Database schema is up to date.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {status.pending.map((m) => (
                  <li
                    key={m}
                    className="py-2 px-3 text-sm font-mono flex items-center gap-2"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    {m}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Deploy control */}
          <div className="glass p-5 rounded-xl border border-red-400/20">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-1">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              Apply pending migrations
            </h3>

            {!status.runnerEnabled ? (
              <div className="flex items-start gap-2 text-sm text-muted-foreground mt-2">
                <Lock className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <span>
                  The runner is <strong>disabled</strong>. Set{" "}
                  <code className="text-orange-400">
                    ENABLE_MIGRATION_RUNNER=true
                  </code>{" "}
                  in the server environment to enable it. Keep it off in
                  production unless you are actively deploying.
                </span>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  Runs <code>prisma migrate deploy</code> — applies{" "}
                  <strong>all pending migrations in order</strong> on the live
                  database. You can&apos;t choose a single migration here. This
                  is irreversible. To confirm, type exactly{" "}
                  <code className="text-orange-400">{CONFIRM_PHRASE}</code> in
                  the box (just that word — no command, no migration name).
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    className="input-glass flex-1"
                    placeholder={`Type ${CONFIRM_PHRASE} to enable`}
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    disabled={running}
                    autoComplete="off"
                  />
                  <Button
                    variant="danger"
                    onClick={deploy}
                    disabled={!canDeploy}
                    loading={running}
                  >
                    {running ? "Running…" : "Run migrate deploy"}
                  </Button>
                </div>
                {!canDeploy && !running && disabledReasons.length > 0 && (
                  <p className="text-xs text-amber-400 mt-2">
                    Button disabled: {disabledReasons.join("; ")}.
                  </p>
                )}
                {knownUpToDate && (
                  <p className="text-xs text-emerald-400 mt-2">
                    Nothing to apply — schema is already up to date.
                  </p>
                )}
                {!status.diskAvailable && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Note: migration files aren&apos;t readable at runtime here,
                    so the pending count is unknown. <code>migrate deploy</code>{" "}
                    is safe to run — it applies only what&apos;s missing and is a
                    no-op if nothing is pending.
                  </p>
                )}
              </>
            )}

            {output && (
              <pre className="mt-4 text-xs bg-black/40 border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-72">
                {output}
              </pre>
            )}
          </div>

          {/* Applied history */}
          <Section title={`Applied (${status.applied.length})`}>
            {status.applied.length === 0 ? (
              <Empty>No applied migrations recorded.</Empty>
            ) : (
              <ul className="divide-y divide-border max-h-80 overflow-y-auto">
                {[...status.applied].reverse().map((m) => (
                  <li
                    key={m.name}
                    className="py-2 px-3 text-sm font-mono flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="truncate">{m.name}</span>
                    </span>
                    {m.finishedAt && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {new Date(m.finishedAt).toLocaleString()}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Historical / orphaned rows */}
          {status.orphans.length > 0 && (
            <Section title={`Historical, not on disk (${status.orphans.length})`}>
              <ul className="divide-y divide-border max-h-60 overflow-y-auto">
                {status.orphans.map((m) => (
                  <li
                    key={m.name}
                    className="py-2 px-3 text-sm font-mono flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {m.failed ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="truncate">{m.name}</span>
                    </span>
                    {m.finishedAt && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {new Date(m.finishedAt).toLocaleString()}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "emerald" | "amber" | "red";
}) {
  const tones = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
  } as const;
  return (
    <div className="glass p-4 rounded-xl flex items-center gap-3">
      <Icon className={`w-7 h-7 ${tones[tone]}`} />
      <div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 text-xs font-semibold uppercase text-muted-foreground bg-secondary/40 border-b border-border">
        {title}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-6 px-4 text-sm text-muted-foreground text-center">
      {children}
    </p>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "amber" | "red";
  children: React.ReactNode;
}) {
  const tones = {
    amber: "border-amber-400/30 bg-amber-500/10 text-amber-300",
    red: "border-red-400/30 bg-red-500/10 text-red-300",
  } as const;
  return (
    <div
      className={`flex items-start gap-2 text-sm border rounded-lg p-3 ${tones[tone]}`}
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div>{children}</div>
    </div>
  );
}
