/**
 * POST /api/admin/email-templates/seed
 *
 * Upserts all 24 default email templates into the database.
 * Protected by:
 *   1. Valid admin session (cookie-based)
 *   2. x-seed-token header must match EMAIL_SEED_SECRET env var (if set)
 *
 * Existing templates are updated; new ones are created.
 * Returns a summary of upserted slugs.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getEmailTemplateSeeds } from "@/lib/email-template-seeds";

export async function POST(req: NextRequest) {
  // ── 1. Admin session check ──────────────────────────────────────────────────
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Optional secret token check ─────────────────────────────────────────
  const seedSecret = process.env.EMAIL_SEED_SECRET;
  if (seedSecret) {
    const token = req.headers.get("x-seed-token");
    if (!token || token !== seedSecret) {
      return NextResponse.json({ error: "Invalid seed token" }, { status: 403 });
    }
  }

  // ── 3. Upsert all templates ─────────────────────────────────────────────────
  try {
    const templates = getEmailTemplateSeeds();
    const results: { slug: string; action: "created" | "updated" }[] = [];

    for (const tpl of templates) {
      const existing = await prisma.emailTemplate.findUnique({ where: { slug: tpl.slug } });

      await prisma.emailTemplate.upsert({
        where:  { slug: tpl.slug },
        update: {
          name:        tpl.name,
          subject:     tpl.subject,
          htmlBody:    tpl.htmlBody,
          description: tpl.description,
          variables:   tpl.variables,
          isActive:    true,
        },
        create: {
          name:        tpl.name,
          slug:        tpl.slug,
          subject:     tpl.subject,
          htmlBody:    tpl.htmlBody,
          description: tpl.description,
          variables:   tpl.variables,
          isActive:    true,
        },
      });

      results.push({ slug: tpl.slug, action: existing ? "updated" : "created" });
    }

    const created = results.filter((r) => r.action === "created").length;
    const updated = results.filter((r) => r.action === "updated").length;

    return NextResponse.json({
      success: true,
      message: `Seeded ${templates.length} templates (${created} created, ${updated} updated).`,
      results,
    });
  } catch (err) {
    console.error("[POST /api/admin/email-templates/seed]", err);
    return NextResponse.json({ error: "Failed to seed templates." }, { status: 500 });
  }
}
