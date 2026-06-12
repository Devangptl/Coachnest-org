/**
 * GET /api/org/check-slug?slug=acme — slug availability for the
 * registration wizard (debounced client-side).
 */
import { NextRequest, NextResponse } from "next/server";
import { orgSlugSchema } from "@/lib/validation/org";
import { isSlugAvailable } from "@/services/organization.service";

export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get("slug") ?? "";
    const parsed = orgSlugSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({
        available: false,
        reason: parsed.error.issues[0]?.message ?? "Invalid slug",
      });
    }
    const available = await isSlugAvailable(parsed.data);
    return NextResponse.json({ available, reason: available ? null : "Slug is already taken" });
  } catch (error) {
    console.error("[GET /api/org/check-slug]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
