/**
 * GET  /api/highlights?lessonId=xxx — fetch all highlights for the current user on a lesson
 * POST /api/highlights               — create a new highlight
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const lessonId = req.nextUrl.searchParams.get("lessonId");
    if (!lessonId) {
      return NextResponse.json({ error: "lessonId is required." }, { status: 400 });
    }

    const highlights = await prisma.highlight.findMany({
      where: { userId: session.userId, lessonId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ highlights });
  } catch (error) {
    console.error("[GET /api/highlights]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const { lessonId, text, blockIndex, startOffset, endOffset, color, note } = body;

    if (!lessonId || !text || blockIndex === undefined || startOffset === undefined || endOffset === undefined) {
      return NextResponse.json(
        { error: "lessonId, text, blockIndex, startOffset, and endOffset are required." },
        { status: 400 }
      );
    }

    const highlight = await prisma.highlight.create({
      data: {
        userId: session.userId,
        lessonId,
        text,
        blockIndex: Number(blockIndex),
        startOffset: Number(startOffset),
        endOffset: Number(endOffset),
        color: color || "#a855f7",
        note: note || null,
      },
    });

    return NextResponse.json({ highlight }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/highlights]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
