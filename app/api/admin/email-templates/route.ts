/**
 * GET  /api/admin/email-templates — list all templates
 * POST /api/admin/email-templates — create a new template
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await prisma.emailTemplate.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { logs: true } },
      },
    });

    return NextResponse.json({ templates });
  } catch (err) {
    console.error("[GET /api/admin/email-templates]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, slug, subject, htmlBody, description, variables, isActive } = body;

    if (!name || !slug || !subject || !htmlBody) {
      return NextResponse.json(
        { error: "name, slug, subject, and htmlBody are required" },
        { status: 400 }
      );
    }

    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(slug)) {
      return NextResponse.json(
        { error: "Slug must be lowercase letters, numbers, and hyphens only" },
        { status: 400 }
      );
    }

    const existing = await prisma.emailTemplate.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "A template with this slug already exists" }, { status: 409 });
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name,
        slug,
        subject,
        htmlBody,
        description: description || null,
        variables: variables || [],
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/email-templates]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
