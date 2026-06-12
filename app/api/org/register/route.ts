/**
 * POST /api/org/register — create an organization (PENDING), its first
 * ORG_ADMIN, a PENDING subscription + transaction, and a Razorpay order.
 * The org activates after payment via /api/org/verify-payment (or webhook).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { registerOrganizationSchema } from "@/lib/validation/org";
import { registerOrganization } from "@/services/organization.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerOrganizationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const session = await getSession();
    if (parsed.data.admin.useCurrentUser && !session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!parsed.data.admin.useCurrentUser && !parsed.data.admin.password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const result = await registerOrganization({
      ...parsed.data,
      currentUserId: session?.userId ?? null,
    });

    return NextResponse.json(
      {
        orgSlug: result.orgSlug,
        transactionId: result.transactionId,
        razorpayOrderId: result.razorpayOrderId,
        amount: result.amount,
        currency: result.currency,
        razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/org/register]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("already") || message.includes("taken") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
