/**
 * GET  /api/admin/features — list all platform features (active and inactive)
 * POST /api/admin/features — create a new platform feature add-on
 *
 * Access: ADMIN only
 *
 * POST body:
 *   { name: string, slug: string, description?: string, price: number, isActive?: boolean }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import slugify from "slugify";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const features = await prisma.platformFeature.findMany({
      include: { _count: { select: { purchases: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ features });
  } catch (err) {
    console.error("[GET /api/admin/features]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, slug: rawSlug, description, price, isActive } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required." }, { status: 400 });
    }
    if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
      return NextResponse.json({ error: "price must be a non-negative number." }, { status: 400 });
    }

    // Generate slug from name if not provided
    const slug = rawSlug?.trim()
      ? slugify(rawSlug.trim(), { lower: true, strict: true })
      : slugify(name.trim(), { lower: true, strict: true });

    const existing = await prisma.platformFeature.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: `A feature with slug "${slug}" already exists.` }, { status: 409 });
    }

    const feature = await prisma.platformFeature.create({
      data: {
        name:        name.trim(),
        slug,
        description: description?.trim() || null,
        price:       Number(price),
        isActive:    isActive !== false,
      },
    });

    return NextResponse.json({ feature }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/features]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
