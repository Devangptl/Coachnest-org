/**
 * GET /api/admin/migrations — read-only migration status (admin only).
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMigrationStatus } from "@/services/migration.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const status = await getMigrationStatus();
    return NextResponse.json({ status });
  } catch (err) {
    console.error("[GET /api/admin/migrations]", err);
    return NextResponse.json(
      { error: "Failed to read migration status" },
      { status: 500 },
    );
  }
}
