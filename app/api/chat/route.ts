/**
 * POST /api/chat — Send a message to the AI tutor and get a response.
 * Creates/reuses a conversation per user+lesson pair.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatWithTutor, ChatMessage } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { lessonId, message, conversationId } = body as {
    lessonId: string;
    message: string;
    conversationId?: string;
  };

  if (!lessonId || !message?.trim()) {
    return NextResponse.json({ error: "lessonId and message are required" }, { status: 400 });
  }

  // Fetch lesson for context
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, title: true, content: true, courseId: true },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  // Get or create conversation
  let conversation;
  if (conversationId) {
    conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: session.userId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  if (!conversation) {
    const created = await prisma.conversation.create({
      data: {
        userId: session.userId,
        lessonId,
        title: message.slice(0, 100),
      },
    });
    conversation = { ...created, messages: [] as { id: string; role: string; content: string; createdAt: Date; conversationId: string }[] };
  }

  // Build history from previous messages (last 20 for context window)
  const history: ChatMessage[] = conversation.messages
    .slice(-20)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // Call Gemini API
  try {
    const aiResponse = await chatWithTutor(
      lesson.title,
      lesson.content,
      history,
      message.trim()
    );

    // Save both messages
    await prisma.message.createMany({
      data: [
        { conversationId: conversation.id, role: "user", content: message.trim() },
        { conversationId: conversation.id, role: "assistant", content: aiResponse },
      ],
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      conversationId: conversation.id,
      response: aiResponse,
    });
  } catch (err) {
    console.error("AI Chat failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to get AI response" },
      { status: 500 }
    );
  }
}
