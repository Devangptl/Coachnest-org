/**
 * Migration service — read-only status + a tightly-gated `prisma migrate deploy`.
 *
 * Security model (defense in depth):
 *  - Admin-only (enforced again in every route handler that calls this).
 *  - Execution is OFF unless `ENABLE_MIGRATION_RUNNER=true` (server env, never
 *    NEXT_PUBLIC). This lets you keep it disabled in production by default.
 *  - The ONLY command that can ever run is `prisma migrate deploy`, passed as a
 *    fixed argv array to execFile (NO shell, NO user input) — so there is no
 *    command-injection surface and destructive commands (dev/reset/db push/
 *    raw SQL) are impossible by construction.
 *  - Hard timeout + in-process concurrency lock + durable audit record.
 */
import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access, readdir } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

const execFileAsync = promisify(execFile);

const DEPLOY_TIMEOUT_MS = 120_000;
const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");
const PRISMA_BIN = path.join(process.cwd(), "node_modules", ".bin", "prisma");

// In-process lock — blocks overlapping deploys within a single instance.
let deployInFlight = false;

export function isRunnerEnabled(): boolean {
  return process.env.ENABLE_MIGRATION_RUNNER === "true";
}

interface AppliedRow {
  migration_name: string;
  started_at: Date | null;
  finished_at: Date | null;
  rolled_back_at: Date | null;
  applied_steps_count: number;
}

export interface MigrationStatus {
  runnerEnabled: boolean;
  historyAvailable: boolean;
  diskAvailable: boolean;
  applied: { name: string; finishedAt: string | null }[];
  pending: string[];
  failed: { name: string; startedAt: string | null }[];
}

/** Read the names of all migrations committed to the repo (on disk). */
async function diskMigrations(): Promise<string[] | null> {
  try {
    const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
    const names: string[] = [];
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      try {
        await access(path.join(MIGRATIONS_DIR, e.name, "migration.sql"));
        names.push(e.name);
      } catch {
        /* not a migration dir */
      }
    }
    return names.sort();
  } catch {
    return null; // folder not bundled at runtime
  }
}

/** Read applied migrations from Prisma's own `_prisma_migrations` table. */
async function appliedMigrations(): Promise<AppliedRow[] | null> {
  try {
    return await prisma.$queryRaw<AppliedRow[]>`
      SELECT migration_name, started_at, finished_at,
             rolled_back_at, applied_steps_count
      FROM   "_prisma_migrations"
      ORDER  BY started_at ASC
    `;
  } catch {
    return null; // table doesn't exist (no migrate history)
  }
}

export async function getMigrationStatus(): Promise<MigrationStatus> {
  const [disk, applied] = await Promise.all([
    diskMigrations(),
    appliedMigrations(),
  ]);

  const appliedOk = (applied ?? []).filter(
    (r) => r.finished_at && !r.rolled_back_at,
  );
  const appliedNames = new Set(appliedOk.map((r) => r.migration_name));

  const failed = (applied ?? [])
    .filter((r) => !r.finished_at || r.rolled_back_at)
    .map((r) => ({
      name: r.migration_name,
      startedAt: r.started_at ? r.started_at.toISOString() : null,
    }));

  const pending = (disk ?? []).filter((n) => !appliedNames.has(n));

  return {
    runnerEnabled: isRunnerEnabled(),
    historyAvailable: applied !== null,
    diskAvailable: disk !== null,
    applied: appliedOk.map((r) => ({
      name: r.migration_name,
      finishedAt: r.finished_at ? r.finished_at.toISOString() : null,
    })),
    pending,
    failed,
  };
}

export interface DeployResult {
  ok: boolean;
  output: string;
  pendingBefore: number;
  pendingAfter: number;
}

/**
 * Runs `prisma migrate deploy` — applies committed, reviewed migration files.
 * Never generates, resets, or runs arbitrary SQL. Caller MUST have already
 * verified the actor is an ADMIN and that the runner is enabled.
 */
export async function runMigrateDeploy(actor: {
  userId: string;
  email: string;
}): Promise<DeployResult> {
  if (!isRunnerEnabled()) {
    throw new Error("Migration runner is disabled (ENABLE_MIGRATION_RUNNER)");
  }
  if (deployInFlight) {
    throw new Error("A migration deploy is already in progress");
  }

  try {
    await access(PRISMA_BIN);
  } catch {
    throw new Error(
      "Prisma CLI not found in node_modules — deploy unavailable in this environment",
    );
  }

  deployInFlight = true;
  const before = await getMigrationStatus();
  const startedAt = new Date();

  try {
    const { stdout, stderr } = await execFileAsync(
      PRISMA_BIN,
      ["migrate", "deploy"], // fixed args — no shell, no user input
      {
        cwd: process.cwd(),
        timeout: DEPLOY_TIMEOUT_MS,
        killSignal: "SIGKILL",
        maxBuffer: 10 * 1024 * 1024,
        env: process.env,
      },
    );
    const output = `${stdout}\n${stderr}`.trim();
    const after = await getMigrationStatus();

    await audit(actor, true, output, startedAt);
    return {
      ok: true,
      output,
      pendingBefore: before.pending.length,
      pendingAfter: after.pending.length,
    };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    const output =
      `${e.stdout ?? ""}\n${e.stderr ?? ""}`.trim() ||
      e.message ||
      "Migration failed";
    await audit(actor, false, output, startedAt);
    throw new Error(output);
  } finally {
    deployInFlight = false;
  }
}

/** Durable audit trail — a SYSTEM notification for the acting admin + log. */
async function audit(
  actor: { userId: string; email: string },
  ok: boolean,
  output: string,
  startedAt: Date,
) {
  const summary = ok ? "succeeded" : "FAILED";
  console.warn(
    `[migration-runner] migrate deploy ${summary} — by ${actor.email} ` +
      `at ${startedAt.toISOString()}`,
  );
  try {
    await prisma.notification.create({
      data: {
        userId: actor.userId,
        type: "SYSTEM",
        title: `Database migration ${summary}`,
        body:
          `prisma migrate deploy ${summary} at ` +
          `${startedAt.toISOString()}.\n\n${output.slice(0, 1500)}`,
        link: "/admin/migrations",
      },
    });
  } catch (e) {
    console.error("[migration-runner] failed to write audit notification", e);
  }
}
