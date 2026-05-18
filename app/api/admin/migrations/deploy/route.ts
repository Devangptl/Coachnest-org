/**
 * POST /api/admin/migrations/deploy — apply pending migrations.
 *
 * Hard guards: ADMIN only, ENABLE_MIGRATION_RUNNER=true, and the request body
 * must explicitly echo the confirmation phrase. Only ever runs
 * `prisma migrate deploy` (see migration.service for the full security model).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isRunnerEnabled, runMigrateDeploy } from "@/services/migration.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONFIRM_PHRASE = "migrate deploy";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isRunnerEnabled()) {
    return NextResponse.json(
      { error: "Migration runner is disabled on this server." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || body.confirm !== CONFIRM_PHRASE) {
    return NextResponse.json(
      { error: `Confirmation required: send { "confirm": "${CONFIRM_PHRASE}" }` },
      { status: 400 },
    );
  }

  try {
    const result = await runMigrateDeploy({
      userId: session.userId,
      email: session.email,
    });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Migration failed";
    const status = msg.includes("already in progress") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
