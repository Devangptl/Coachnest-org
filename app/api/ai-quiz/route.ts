/**
 * POST /api/ai-quiz — Generate MCQ quiz from lesson content using AI.
 * Body: { lessonId, questionCount? }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateQuizFromLesson } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { lessonId, questionCount = 5 } = body as {
    lessonId: string;
    questionCount?: number;
  };

  if (!lessonId) {
    return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
  }

  const count = Math.min(Math.max(questionCount, 3), 10);

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { title: true, content: true },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  if (!lesson.content || lesson.content.trim().length < 50) {
    return NextResponse.json(
      { error: "Lesson content is too short to generate a quiz" },
      { status: 400 }
    );
  }

  try {
    const questions = await generateQuizFromLesson(
      lesson.title,
      lesson.content,
      count
    );

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("AI Quiz generation failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
