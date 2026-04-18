/**
 * GET  /api/community/groups — list study groups
 * POST /api/community/groups — create a new study group
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFeatureAccess } from "@/lib/feature-access";
import { emit } from "@/lib/realtime/emit";
import { channels, events } from "@/lib/realtime/channels";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const courseId = searchParams.get("courseId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;

    const where: Record<string, unknown> = {};
    if (courseId) where.courseId = courseId;

    const [groups, total] = await Promise.all([
      prisma.studyGroup.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, avatar: true } },
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.studyGroup.count({ where }),
    ]);

    return NextResponse.json(
      { groups, total, page, totalPages: Math.ceil(total / limit) },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (err) {
    console.error("[GET /api/community/groups]", err);
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
          error: "Creating study groups requires purchasing the Community add-on.",
          featureSlug: "community",
        },
        { status: 403 }
      );
    }

    const { name, description, courseId, maxMembers, isPublic, requiresApproval } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    const inviteCode = crypto.randomBytes(6).toString("hex");

    const group = await prisma.studyGroup.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        courseId: courseId || null,
        maxMembers: maxMembers || 20,
        isPublic: isPublic !== false,
        requiresApproval: requiresApproval === true,
        inviteCode,
        createdById: session.userId,
        members: {
          create: { userId: session.userId, role: "ADMIN" },
        },
      },
      include: {
        createdBy: { select: { id: true, name: true, avatar: true } },
        _count: { select: { members: true } },
      },
    });

    const activity = await prisma.activityFeedEvent.create({
      data: {
        userId: session.userId,
        type: "GROUP_CREATED",
        title: `Created study group "${name.trim()}"`,
        meta: { groupId: group.id },
      },
    });
    await emit(channels.activityFeed(), events.activityCreated, activity);

    return NextResponse.json({ group }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/community/groups]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
