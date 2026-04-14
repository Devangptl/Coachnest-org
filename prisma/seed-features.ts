/**
 * Upserts platform feature add-ons into the database.
 * Safe to run multiple times (upsert on slug).
 *
 * Run: npx tsx prisma/seed-features.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FEATURES = [
  {
    name:        "Community Access",
    slug:        "community",
    description: "Join the full community experience — post in discussion forums, create and join study groups, submit work for peer review, and participate in the activity feed.",
    price:       499,
    isActive:    true,
  },
];

async function main() {
  console.log("Seeding platform features…");

  for (const f of FEATURES) {
    const result = await prisma.platformFeature.upsert({
      where:  { slug: f.slug },
      update: { name: f.name, description: f.description, price: f.price, isActive: f.isActive },
      create: f,
    });
    console.log(`  ✓ ${result.name} (slug: ${result.slug}, id: ${result.id})`);
  }

  console.log("\nDone — platform features are ready.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
