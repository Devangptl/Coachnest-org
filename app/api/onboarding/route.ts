/**
 * GET /api/onboarding  — get current user's professions + onboarding state
 * PUT /api/onboarding  — save profession selections + mark onboarding complete
 *
 * Body for PUT:
 *   {
 *     professionIds:  string[]   // IDs of predefined professions to select
 *     customNames:    string[]   // custom profession names (free-text)
 *     complete:       boolean    // true = mark hasCompletedOnboarding
 *   }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        hasCompletedOnboarding: true,
        professions: {
          include: {
            profession: {
              select: {
                id: true,
                slug: true,
                name: true,
                icon: true,
                color: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    return NextResponse.json({
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      professions: user.professions,
    });
  } catch (error) {
    console.error("[GET /api/onboarding]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const {
      professionIds = [],
      customNames   = [],
      complete      = false,
    }: {
      professionIds?: string[];
      customNames?:   string[];
      complete?:      boolean;
    } = await req.json();

    // Validate that passed professionIds exist
    if (professionIds.length > 0) {
      const count = await prisma.profession.count({
        where: { id: { in: professionIds }, isActive: true },
      });
      if (count !== professionIds.length) {
        return NextResponse.json(
          { error: "One or more invalid profession IDs." },
          { status: 400 }
        );
      }
    }

    // Replace all existing professions for this user in a transaction
    await prisma.$transaction(async (tx) => {
      // Remove all existing user professions
      await tx.userProfession.deleteMany({ where: { userId: session.userId } });

      // Re-insert standard profession selections
      if (professionIds.length > 0) {
        await tx.userProfession.createMany({
          data: professionIds.map((professionId) => ({
            userId: session.userId,
            professionId,
          })),
          skipDuplicates: true,
        });
      }

      // Insert custom profession entries (no professionId)
      const trimmedCustom = customNames
        .map((n) => n.trim())
        .filter((n) => n.length > 0)
        .slice(0, 5); // cap at 5 custom professions

      if (trimmedCustom.length > 0) {
        await tx.userProfession.createMany({
          data: trimmedCustom.map((customName) => ({
            userId: session.userId,
            professionId: null,
            customName,
          })),
        });
      }

      // Mark onboarding complete if requested
      if (complete) {
        await tx.user.update({
          where:  { id: session.userId },
          data:   { hasCompletedOnboarding: true },
        });
      }
    });

    return NextResponse.json({ message: "Professions saved." });
  } catch (error) {
    console.error("[PUT /api/onboarding]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
