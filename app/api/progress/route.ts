/**
 * POST /api/progress  — mark a lesson as complete/incomplete for the current user
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { lessonId, completed } = await req.json();
    if (!lessonId) {
      return NextResponse.json({ error: "lessonId is required." }, { status: 400 });
    }

    const progress = await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: { userId: session.userId, lessonId },
      },
      update: {
        completed: Boolean(completed),
        completedAt: completed ? new Date() : null,
      },
      create: {
        userId: session.userId,
        lessonId,
        completed: Boolean(completed),
        completedAt: completed ? new Date() : null,
      },
    });

    return NextResponse.json({ progress });
  } catch (error) {
    console.error("[POST /api/progress]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
