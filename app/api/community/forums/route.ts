/**
 * GET  /api/community/forums      — list forum threads (filter by courseId/lessonId)
 * POST /api/community/forums      — create a new thread (auth required)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFeatureAccess } from "@/lib/feature-access";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const courseId = searchParams.get("courseId");
    const lessonId = searchParams.get("lessonId");
    const sort = searchParams.get("sort") || "recent"; // recent | popular
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;

    const where: Record<string, unknown> = {};
    if (courseId) where.courseId = courseId;
    if (lessonId) where.lessonId = lessonId;

    const orderBy =
      sort === "popular"
        ? { replies: { _count: "desc" as const } }
        : { createdAt: "desc" as const };

    const [threads, total] = await Promise.all([
      prisma.forumThread.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, avatar: true } },
          _count: { select: { replies: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.forumThread.count({ where }),
    ]);

    return NextResponse.json(
      { threads, total, page, totalPages: Math.ceil(total / limit) },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (err) {
    console.error("[GET /api/community/forums]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const canAccess = await hasFeatureAccess(session.userId, session.role, "community");
    if (!canAccess) {
      return NextResponse.json(
        {
          error: "Access to forums requires purchasing the Community add-on.",
          featureSlug: "community",
        },
        { status: 403 }
      );
    }

    const { title, body, courseId, lessonId } = await req.json();
    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
    }

    const thread = await prisma.forumThread.create({
      data: {
        title: title.trim(),
        body: body.trim(),
        courseId: courseId || null,
        lessonId: lessonId || null,
        authorId: session.userId,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        _count: { select: { replies: true } },
      },
    });

    // Create activity feed event
    await prisma.activityFeedEvent.create({
      data: {
        userId: session.userId,
        type: "THREAD_CREATED",
        title: `Started a discussion: "${title.trim()}"`,
        meta: { threadId: thread.id, courseId },
      },
    });

    return NextResponse.json({ thread }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/community/forums]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
