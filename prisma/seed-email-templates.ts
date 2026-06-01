/**
 * Coachnest — Email Templates Seed
 *
 * Upserts default HTML templates for every system email slug.
 * Template HTML is defined in lib/email-template-seeds.ts.
 *
 * Run:  npm run db:seed:emails
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { getEmailTemplateSeeds } from "../lib/email-template-seeds";

const prisma = new PrismaClient();

async function main() {
  const templates = getEmailTemplateSeeds();
  console.log(`Seeding ${templates.length} email templates…\n`);

  for (const tpl of templates) {
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
    console.log(`  ✓  ${tpl.slug}`);
  }

  console.log("\nDone. All email templates seeded.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
