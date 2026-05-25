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
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { prisma } from "@/lib/prisma";

const execFileAsync = promisify(execFile);

const DEPLOY_TIMEOUT_MS = 120_000;
const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");

// In-process lock — blocks overlapping deploys within a single instance.
let deployInFlight = false;

export function isRunnerEnabled(): boolean {
  return process.env.ENABLE_MIGRATION_RUNNER === "true";
}

/**
 * Locate a runnable Prisma CLI across deployment layouts (dev, Docker,
 * Next.js standalone, Vercel/Lambda). Order of preference:
 *
 *  1. The prisma package's JS entry, resolved via Node's module algorithm
 *     (`prisma/package.json` → `<dir>/build/index.js`). This is the most
 *     reliable target because it doesn't rely on `.bin` symlinks, which
 *     are routinely stripped from bundled / packed deployments.
 *  2. `.bin/prisma` symlinks under a few plausible roots.
 *
 * Returns `null` when none are found — the runner stays disabled and the
 * caller surfaces a clear error.
 */
function resolvePrismaCommand(): { cmd: string; args: string[] } | null {
  // (1) JS entry through Node's resolver.
  try {
    const req = createRequire(path.join(process.cwd(), "package.json"));
    const pkgPath = req.resolve("prisma/package.json");
    const main = path.join(path.dirname(pkgPath), "build", "index.js");
    if (existsSync(main)) {
      return { cmd: process.execPath, args: [main] };
    }
  } catch {
    /* package not resolvable from cwd — fall through to .bin candidates */
  }

  // (2) Fallback to .bin symlinks.
  const candidates = [
    path.join(process.cwd(), "node_modules", ".bin", "prisma"),
    path.join(process.cwd(), "..", "node_modules", ".bin", "prisma"),
    path.join(process.cwd(), ".next", "standalone", "node_modules", ".bin", "prisma"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return { cmd: c, args: [] };
  }

  return null;
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
  /**
   * Rows present in `_prisma_migrations` whose migration file is no longer
   * on disk — historical entries from baselined / squashed / renamed
   * migrations. These do NOT block `migrate deploy` for current files.
   */
  orphans: { name: string; finishedAt: string | null; failed: boolean }[];
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
  const [disk, allRows] = await Promise.all([
    diskMigrations(),
    appliedMigrations(),
  ]);

  // `_prisma_migrations` can have MULTIPLE rows for the same migration_name —
  // every failed attempt leaves a row, and the eventually-successful retry
  // adds another. Categorising each row independently would double-count
  // (same migration shows up as "applied" and "failed" simultaneously).
  // Collapse to one canonical row per migration_name: the most recent attempt.
  const byName = new Map<string, AppliedRow>();
  for (const r of allRows ?? []) {
    const existing = byName.get(r.migration_name);
    if (!existing) {
      byName.set(r.migration_name, r);
      continue;
    }
    const existingT = existing.started_at?.getTime() ?? 0;
    const candT = r.started_at?.getTime() ?? 0;
    // Prefer the row that's actually finished — a successful retry wins over
    // an older failed row even if the clocks tie.
    const candIsBetter =
      candT > existingT ||
      (candT === existingT && !!r.finished_at && !existing.finished_at);
    if (candIsBetter) byName.set(r.migration_name, r);
  }
  const canonical = Array.from(byName.values());

  // Cross-reference with disk. A row in `_prisma_migrations` whose file is
  // no longer on disk is an ORPHAN — a historical entry from a baselined,
  // squashed, or renamed migration. Orphans must not be counted as
  // applied/failed for the current codebase, otherwise:
  //   1) an old failed orphan blocks the deploy of an unrelated new migration
  //   2) the totals are confusing (you see "1 applied" but the list looks
  //      empty because the entry doesn't match anything you'd recognise).
  // When disk isn't readable at runtime (serverless), we can't tell orphans
  // apart — fall back to counting every row.
  const onDisk = disk ? new Set(disk) : null;
  const isOnDisk = (name: string) => (onDisk ? onDisk.has(name) : true);

  const appliedRows = canonical.filter(
    (r) => isOnDisk(r.migration_name) && r.finished_at && !r.rolled_back_at,
  );

  const failedRows = canonical.filter(
    (r) =>
      isOnDisk(r.migration_name) && (!r.finished_at || r.rolled_back_at),
  );

  const orphans = (onDisk
    ? canonical.filter((r) => !onDisk.has(r.migration_name))
    : []
  ).map((r) => ({
    name: r.migration_name,
    finishedAt: r.finished_at ? r.finished_at.toISOString() : null,
    failed: !r.finished_at || !!r.rolled_back_at,
  }));

  // Anything on disk without any row at all is pending. Failed / rolled-back
  // migrations are NOT pending — they need to be resolved, not re-queued.
  const recordedNames = new Set(byName.keys());
  const pending = (disk ?? []).filter((n) => !recordedNames.has(n));

  return {
    runnerEnabled: isRunnerEnabled(),
    historyAvailable: allRows !== null,
    diskAvailable: disk !== null,
    applied: appliedRows.map((r) => ({
      name: r.migration_name,
      finishedAt: r.finished_at ? r.finished_at.toISOString() : null,
    })),
    pending,
    failed: failedRows.map((r) => ({
      name: r.migration_name,
      startedAt: r.started_at ? r.started_at.toISOString() : null,
    })),
    orphans,
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

  const resolved = resolvePrismaCommand();
  if (!resolved) {
    throw new Error(
      "Prisma CLI not found in node_modules — deploy unavailable in this environment. " +
        "Ensure the `prisma` package is installed in production (devDependencies are skipped " +
        "in many deploys — move it to dependencies, or run migrations from a build/CI step).",
    );
  }

  deployInFlight = true;
  const before = await getMigrationStatus();
  const startedAt = new Date();

  try {
    const { stdout, stderr } = await execFileAsync(
      resolved.cmd,
      // Fixed args — no shell, no user input. The first segment of args is
      // the JS entry path when invoking via `node`; "migrate deploy" is
      // always the trailing pair.
      [...resolved.args, "migrate", "deploy"],
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
