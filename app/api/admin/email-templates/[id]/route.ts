/**
 * GET    /api/admin/email-templates/[id] — get single template
 * PATCH  /api/admin/email-templates/[id] — update template
 * DELETE /api/admin/email-templates/[id] — delete template
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const template = await prisma.emailTemplate.findUnique({
      where: { id },
      include: { _count: { select: { logs: true } } },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (err) {
    console.error("[GET /api/admin/email-templates/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const body = await req.json();
    const { name, slug, subject, htmlBody, description, variables, isActive } = body;

    const existing = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (slug && slug !== existing.slug) {
      const slugPattern = /^[a-z0-9-]+$/;
      if (!slugPattern.test(slug)) {
        return NextResponse.json(
          { error: "Slug must be lowercase letters, numbers, and hyphens only" },
          { status: 400 }
        );
      }
      const conflict = await prisma.emailTemplate.findUnique({ where: { slug } });
      if (conflict) {
        return NextResponse.json({ error: "A template with this slug already exists" }, { status: 409 });
      }
    }

    const updated = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(subject !== undefined && { subject }),
        ...(htmlBody !== undefined && { htmlBody }),
        ...(description !== undefined && { description: description || null }),
        ...(variables !== undefined && { variables }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ template: updated });
  } catch (err) {
    console.error("[PATCH /api/admin/email-templates/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const existing = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    await prisma.emailTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/email-templates/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
