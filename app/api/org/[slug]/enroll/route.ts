/**
 * POST /api/org/[slug]/enroll — free enrollment in an org course
 * (access covered by the org subscription). Any org member.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOrgRole, orgAuthErrorResponse } from "@/lib/org-auth";
import { enrollOrgStudent } from "@/services/organization.service";

const schema = z.object({ courseId: z.string().min(1) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgRole(slug, ["ORG_ADMIN", "ORG_INSTRUCTOR", "ORG_STUDENT"]);

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const enrollment = await enrollOrgStudent(ctx.org.id, ctx.session.userId, parsed.data.courseId);
    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (error) {
    const res = orgAuthErrorResponse(error);
    if (res) return res;
    console.error("[POST /api/org/[slug]/enroll]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Already") ? 409 : message.includes("not found") ? 404 : 500 },
    );
  }
}
