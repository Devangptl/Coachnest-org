/**
 * GET  /api/whiteboards  — boards the caller owns or collaborates on.
 * POST /api/whiteboards  — create a new (standalone or context-attached) board.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createWhiteboardSchema } from "@/lib/validation/whiteboard";
import { createWhiteboard, listWhiteboardsForUser } from "@/services/whiteboard.service";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const whiteboards = await listWhiteboardsForUser(session.userId);
  return NextResponse.json({ whiteboards });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createWhiteboardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const whiteboard = await createWhiteboard(session.userId, parsed.data);
    return NextResponse.json({ whiteboard }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/whiteboards]", err);
    return NextResponse.json({ error: "Failed to create whiteboard" }, { status: 500 });
  }
}
