/**
 * GET    /api/wishlist         — get current user's wishlist
 * POST   /api/wishlist         — add a course to wishlist  { courseId }
 * DELETE /api/wishlist?courseId — remove from wishlist
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const items = await prisma.wishlist.findMany({
      where: { userId: session.userId },
      include: {
        course: {
          select: {
            id: true, title: true, thumbnail: true, price: true,
            discountPrice: true, isFree: true, level: true,
            createdBy: { select: { name: true } },
            _count: { select: { enrollments: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ wishlist: items.map((i) => i.course) });
  } catch (err) {
    console.error("[GET /api/wishlist]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { courseId } = await req.json();
    if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });

    await prisma.wishlist.upsert({
      where: { userId_courseId: { userId: session.userId, courseId } },
      create: { userId: session.userId, courseId },
      update: {},
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/wishlist]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const courseId = req.nextUrl.searchParams.get("courseId");
    if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });

    await prisma.wishlist.deleteMany({
      where: { userId: session.userId, courseId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/wishlist]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
