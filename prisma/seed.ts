/**
 * Seed script — run with: npm run db:seed
 * 1. Clears all tables
 * 2. Creates users in Supabase Auth (so they can actually log in)
 * 3. Mirrors each user to public.users via Prisma (same UUID)
 *
 * Users created:
 *   - 1 admin       admin@example.com
 *   - 5 instructors alice@example.com … eva@example.com
 *   - 10 students   sam@example.com … ava@example.com
 *
 * Password for all: Password123!
 */

import { PrismaClient, Role } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PASSWORD = "Password123!";

// ── helpers ────────────────────────────────────────────────────────────────────

async function clearAll() {
  await prisma.activityFeedEvent.deleteMany();
  await prisma.peerReview.deleteMany();
  await prisma.peerReviewAssignment.deleteMany();
  await prisma.groupNote.deleteMany();
  await prisma.studyGroupMember.deleteMany();
  await prisma.studyGroup.deleteMany();
  await prisma.forumVote.deleteMany();
  await prisma.forumReply.deleteMany();
  await prisma.forumThread.deleteMany();
  await prisma.highlight.deleteMany();
  await prisma.xpEvent.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.userGameProfile.deleteMany();
  await prisma.contactMessage.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.couponUse.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.section.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.review.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.order.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.courseTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.course.deleteMany();
  await prisma.category.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.blog.deleteMany();
  await prisma.user.deleteMany();
  console.log("✓ Prisma tables cleared");

  // Remove all users from Supabase Auth
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) throw error;

  await Promise.all(
    users.map((u) => supabaseAdmin.auth.admin.deleteUser(u.id))
  );
  console.log(`✓ Supabase Auth users cleared (${users.length} deleted)`);
}

/**
 * Creates one user in Supabase Auth and mirrors it to public.users via Prisma.
 * Returns the Prisma user record.
 */
async function createUser({
  name,
  email,
  role,
  headline,
}: {
  name: string;
  email: string;
  role: Role;
  headline?: string;
}) {
  // 1. Create in Supabase Auth
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true, // skip email confirmation in seed
    user_metadata: { name, avatar: null },
    app_metadata: { role },
  });

  if (error || !data.user) {
    throw new Error(`Supabase Auth error for ${email}: ${error?.message}`);
  }

  const supabaseId = data.user.id;

  // 2. Upsert into public.users — the on_auth_user_created trigger may have
  //    already inserted a minimal row; upsert ensures all fields are correct.
  const user = await prisma.user.upsert({
    where: { id: supabaseId },
    create: {
      id: supabaseId,
      name,
      email,
      role,
      headline: headline ?? null,
    },
    update: {
      name,
      email,
      role,
      headline: headline ?? null,
    },
  });

  // 3. Students get a BASIC subscription
  if (role === Role.STUDENT) {
    await prisma.subscription.create({
      data: {
        userId: supabaseId,
        plan: "BASIC",
        status: "ACTIVE",
        startDate: new Date(),
      },
    });
  }

  return user;
}

// ── main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding database…\n");

  await clearAll();
  console.log();

  // Admin
  const admin = await createUser({
    name: "Admin User",
    email: "admin@example.com",
    role: Role.ADMIN,
    headline: "Platform Administrator",
  });
  console.log(`✓ Admin:       ${admin.email}`);

  // Instructors
  const instructorDefs = [
    { name: "Alice Chen",     email: "alice@example.com", headline: "Full-Stack Developer & Educator" },
    { name: "Bob Martinez",   email: "bob@example.com",   headline: "Machine Learning Engineer" },
    { name: "Carol Johnson",  email: "carol@example.com", headline: "UX/UI Design Expert" },
    { name: "David Kim",      email: "david@example.com", headline: "DevOps & Cloud Architect" },
    { name: "Eva Patel",      email: "eva@example.com",   headline: "Data Science Specialist" },
  ];

  for (const def of instructorDefs) {
    const u = await createUser({ ...def, role: Role.INSTRUCTOR });
    console.log(`✓ Instructor:  ${u.email}`);
  }

  // Students
  const studentDefs = [
    { name: "Sam Wilson",   email: "sam@example.com" },
    { name: "Lily Torres",  email: "lily@example.com" },
    { name: "James Park",   email: "james@example.com" },
    { name: "Mia Nguyen",   email: "mia@example.com" },
    { name: "Noah Brown",   email: "noah@example.com" },
    { name: "Olivia Davis", email: "olivia@example.com" },
    { name: "Liam Garcia",  email: "liam@example.com" },
    { name: "Sophia Lee",   email: "sophia@example.com" },
    { name: "Ethan White",  email: "ethan@example.com" },
    { name: "Ava Harris",   email: "ava@example.com" },
  ];

  for (const def of studentDefs) {
    const u = await createUser({ ...def, role: Role.STUDENT });
    console.log(`✓ Student:     ${u.email}`);
  }

  console.log("\n=== Seed complete ===");
  console.log("Total users : 16 (1 admin + 5 instructors + 10 students)");
  console.log("Password    : Password123!");
  console.log("Auth source : Supabase Auth + public.users (same UUID)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
