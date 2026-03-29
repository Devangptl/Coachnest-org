/**
 * GET  /api/community/groups — list study groups
 * POST /api/community/groups — create a new study group
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanAccess } from "@/services/subscription.service";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const courseId = searchParams.get("courseId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;

    const where: Record<string, unknown> = { isPublic: true };
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

    return NextResponse.json({ groups, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("[GET /api/community/groups]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const planAccess = await getPlanAccess(session.userId);
    if (!planAccess.hasInstructorQA) {
      return NextResponse.json(
        { error: "Creating study groups requires a Pro or Enterprise subscription.", requiredPlan: "PRO" },
        { status: 403 }
      );
    }

    const { name, description, courseId, maxMembers, isPublic } = await req.json();
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

    // Create activity feed event
    await prisma.activityFeedEvent.create({
      data: {
        userId: session.userId,
        type: "GROUP_CREATED",
        title: `Created study group "${name.trim()}"`,
        meta: { groupId: group.id },
      },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/community/groups]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
