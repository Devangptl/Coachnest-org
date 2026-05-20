/**
 * POST /api/admin/email-templates/seed
 *
 * Upserts all default email templates into the database.
 * Protected by admin session — only logged-in admins can call this.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getEmailTemplateSeeds } from "@/lib/email-template-seeds";

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
