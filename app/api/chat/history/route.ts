/**
 * GET /api/chat/history — Fetch conversation history for a lesson or all doubts.
 * Query params: ?lessonId=xxx or ?all=true for doubt history
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const lessonId = searchParams.get("lessonId");
  const all = searchParams.get("all");

  // Doubt history — all conversations for this user
  if (all === "true") {
    const conversations = await prisma.conversation.findMany({
      where: { userId: session.userId },
      include: {
        messages: { orderBy: { createdAt: "asc" }, take: 1 },
        lesson: {
          select: {
            id: true,
            title: true,
            course: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        firstMessage: c.messages[0]?.content ?? "",
        lessonTitle: c.lesson.title,
        courseTitle: c.lesson.course.title,
        courseId: c.lesson.course.id,
        lessonId: c.lesson.id,
        messageCount: c.messages.length,
        updatedAt: c.updatedAt,
      })),
    });
  }

  // Lesson-specific conversation
  if (!lessonId) {
    return NextResponse.json({ error: "lessonId or all=true required" }, { status: 400 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: { userId: session.userId, lessonId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  if (!conversation) {
    return NextResponse.json({ conversationId: null, messages: [] });
  }

  return NextResponse.json({
    conversationId: conversation.id,
    messages: conversation.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
  });
}
