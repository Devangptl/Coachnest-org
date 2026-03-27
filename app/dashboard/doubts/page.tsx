/**
 * Dashboard — Doubt History page
 * Shows all AI tutor conversations grouped by course/lesson.
 */
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GlassCard from "@/components/GlassCard";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  MessageCircle,
  BookOpen,
  Clock,
  ArrowRight,
  Bot,
  MessagesSquare,
} from "lucide-react";

export const dynamic = "force-dynamic";

async function getDoubtHistory(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      lesson: {
        select: {
          id: true,
          title: true,
          course: { select: { id: true, title: true, thumbnail: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Group by course
  const courseMap = new Map<
    string,
    {
      courseId: string;
      courseTitle: string;
      courseThumbnail: string | null;
      conversations: typeof conversations;
    }
  >();

  for (const conv of conversations) {
    const cid = conv.lesson.course.id;
    if (!courseMap.has(cid)) {
      courseMap.set(cid, {
        courseId: cid,
        courseTitle: conv.lesson.course.title,
        courseThumbnail: conv.lesson.course.thumbnail,
        conversations: [],
      });
    }
    courseMap.get(cid)!.conversations.push(conv);
  }

  return Array.from(courseMap.values());
}

export default async function DoubtHistoryPage() {
  const session = await getSession();
  if (!session) redirect("/login?from=/dashboard/doubts");

  const courses = await getDoubtHistory(session.userId);
  const totalConversations = courses.reduce(
    (sum, c) => sum + c.conversations.length,
    0
  );
  const totalMessages = courses.reduce(
    (sum, c) =>
      sum + c.conversations.reduce((s, conv) => s + conv.messages.length, 0),
    0
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-400/20">
            <MessageCircle className="h-5 w-5 text-blue-400" />
          </div>
          Doubt History
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Review your past questions and AI tutor conversations.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <GlassCard className="p-4 text-center">
          <MessagesSquare className="h-5 w-5 text-blue-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{totalConversations}</p>
          <p className="text-xs text-muted-foreground">Conversations</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <Bot className="h-5 w-5 text-orange-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{totalMessages}</p>
          <p className="text-xs text-muted-foreground">Messages</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <BookOpen className="h-5 w-5 text-green-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{courses.length}</p>
          <p className="text-xs text-muted-foreground">Courses</p>
        </GlassCard>
      </div>

      {/* Conversations grouped by course */}
      {courses.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Bot className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">
            No conversations yet
          </h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Start asking questions in any lesson to build your doubt history.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-6">
          {courses.map((course) => (
            <GlassCard key={course.courseId} className="p-5">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                {course.courseThumbnail && (
                  <img
                    src={course.courseThumbnail}
                    alt=""
                    className="h-10 w-14 rounded-lg object-cover"
                  />
                )}
                <div>
                  <Link
                    href={`/courses/${course.courseId}`}
                    className="text-sm font-semibold text-white hover:text-blue-400 transition-colors"
                  >
                    {course.courseTitle}
                  </Link>
                  <p className="text-xs text-muted-foreground/70">
                    {course.conversations.length} conversation
                    {course.conversations.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {course.conversations.map((conv) => {
                  const firstUserMsg = conv.messages.find(
                    (m) => m.role === "user"
                  );
                  return (
                    <Link
                      key={conv.id}
                      href={`/courses/${course.courseId}`}
                      className="flex items-start gap-3 rounded-xl p-3 hover:bg-secondary transition-colors group"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                        <MessageCircle className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/80 truncate">
                          {conv.title || firstUserMsg?.content || "Conversation"}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {conv.lesson.title}
                          </span>
                          <span className="text-xs text-white/30 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(conv.updatedAt)}
                          </span>
                          <span className="text-xs text-white/30">
                            {conv.messages.length} msgs
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-white/20 group-hover:text-muted-foreground transition-colors shrink-0 mt-1" />
                    </Link>
                  );
                })}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
