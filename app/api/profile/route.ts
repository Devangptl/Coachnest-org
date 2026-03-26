/**
 * GET  /api/profile — Fetch current user's full profile
 * PUT  /api/profile — Update profile fields (name, bio, headline, website, avatar)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      bio: true,
      headline: true,
      website: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          enrollments: true,
          certificates: true,
          reviews: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, bio, headline, website, avatar } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400 }
      );
    }

    if (website && !/^https?:\/\/.+/.test(website)) {
      return NextResponse.json(
        { error: "Website must be a valid URL starting with http:// or https://" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: {
        name: name.trim(),
        bio: bio?.trim() || null,
        headline: headline?.trim() || null,
        website: website?.trim() || null,
        avatar: avatar?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        headline: true,
        website: true,
      },
    });

    return NextResponse.json({ user: updated, message: "Profile updated." });
  } catch (error) {
    console.error("[profile:update]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
