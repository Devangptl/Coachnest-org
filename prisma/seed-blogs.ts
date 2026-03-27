import { PrismaClient, ContentStatus, Role } from "@prisma/client";
import slugify from "slugify";

const prisma = new PrismaClient();

// ── Pool for Random Generation ───────────────────────────────────────────────

const TECHS = ["React", "Next.js", "TypeScript", "Python", "Node.js", "Tailwind CSS", "Prisma", "Docker", "AWS", "Machine Learning", "Kubernetes", "GraphQL", "Rust", "Go", "Vue.js", "Svelte", "PostgreSQL", "Redis", "Serverless", "Web3"];
const FIELDS = ["Web Development", "Data Science", "DevOps", "Cybersecurity", "Mobile Apps", "Artificial Intelligence", "Cloud Computing", "UI/UX Design", "Software Engineering"];
const CONCEPTS = ["Hooks", "Middleware", "Generators", "Authentication", "State Management", "CI/CD", "Testing", "Deployment", "Microservices", "Scalability", "Clean Code", "Design Patterns"];
const APPS = ["Portfolio", "E-commerce", "SaaS", "Social Media", "Dashboard", "Chat Application", "Job Board", "Learning Management System"];

const TECH_IMAGE_MAP: Record<string, string[]> = {
  "React": ["1633356122544-f134324a6cee", "1581291589117-ad19c0462e4a"],
  "Next.js": ["1612833603922-3bd111354395", "1548092329-199b44584b42"],
  "TypeScript": ["1516116216624-53e697fedbea", "1517694712202-14dd9538aa97"],
  "Python": ["1526374965328-7f61d4dc18c5", "1526379095098-d400fd0bf935"],
  "Node.js": ["1504639725590-34d0984388bd", "1484417895917-af993201f7e0"],
  "Tailwind CSS": ["1587620962725-abab7fe55159", "1507721999472-8ed4421cb462"],
  "Docker": ["1605745341112-85968b19335b", "1667372393119-3d4c48d07fc9"],
  "AWS": ["1451187580459-43490279c0fa", "1544197150-b99a580bb7a8"],
  "Machine Learning": ["1555255707-c07966088b7b", "1485827404703-89b55fcc595e"],
  "Cybersecurity": ["1550751827-4bd374c3f58b", "1563986768-60563d0c0c67"],
  "Data Science": ["1551288049-bebda4e38f71", "1460925895917-afdab827c52f"],
  "UI/UX Design": ["1581291589117-ad19c0462e4a", "1561070791-2526d30994b5"],
};

const GENERIC_TECH_IMAGES = [
  "1517694712202-14dd9538aa97",
  "1587620962725-abab7fe55159",
  "1498050108023-c5249f4df085",
  "1555066931-4365d14bab8c",
];

const TITLE_TEMPLATES = [
  "Mastering {tech} in 2024",
  "Why {tech} is the Future of {field}",
  "10 Tips for {tech} Developers",
  "The Ultimate Guide to {tech}",
  "How to Build a {app} with {tech}",
  "Understanding {concept} in {tech}",
  "{tech} vs {tech2}: Which One to Choose?",
  "Getting Started with {tech} and {tech2}",
  "Advanced {tech} Patterns You Should Know",
  "Boosting Your {field} Skills with {tech}",
  "The Rise of {tech} in Modern {field}",
  "Best Practices for {tech} and {concept}",
];

const PARAGRAPHS = [
  "In the rapidly evolving landscape of {field}, {tech} has emerged as a game-changer. Developers around the world are adopting it for its efficiency and robust ecosystem.",
  "Understanding {concept} is crucial for any developer working with {tech}. It allows for more maintainable code and better performance in large-scale applications.",
  "When building a {app}, you often face challenges with {concept}. This is where the power of {tech} really shines, providing out-of-the-box solutions for common problems.",
  "Comparing {tech} and {tech2} is a common debate in the community. While both have their strengths, your choice should depend on the specific requirements of your {field} project.",
  "The integration of {tech} into {field} workflows has significantly reduced development time and improved the overall user experience of {app} platforms.",
  "As we look towards the future of {field}, it's clear that tools like {tech} will continue to play a pivotal role in shaping how we build and deploy {app} solutions.",
];

const TAGS_POOL = ["javascript", "programming", "software", "development", "web", "coding", "tech", "tutorial", "guide", "tips"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateBlog(index: number, authorId: string) {
  const tech = pick(TECHS);
  const tech2 = pick(TECHS.filter(t => t !== tech));
  const field = pick(FIELDS);
  const concept = pick(CONCEPTS);
  const app = pick(APPS);

  let title = pick(TITLE_TEMPLATES)
    .replace(/{tech}/g, tech)
    .replace(/{tech2}/g, tech2)
    .replace(/{field}/g, field)
    .replace(/{concept}/g, concept)
    .replace(/{app}/g, app);

  // Add index to title if it's the same to avoid slug conflicts, though title templates are quite varied
  if (index > 20) title += ` - Part ${index}`;

  const slug = slugify(title, { lower: true, strict: true });

  const excerpt = pick(PARAGRAPHS)
    .replace(/{tech}/g, tech)
    .replace(/{tech2}/g, tech2)
    .replace(/{field}/g, field)
    .replace(/{concept}/g, concept)
    .replace(/{app}/g, app);

  const contentBlocks = [];
  const numParagraphs = rand(5, 12);
  for (let i = 0; i < numParagraphs; i++) {
    contentBlocks.push(pick(PARAGRAPHS)
      .replace(/{tech}/g, tech)
      .replace(/{tech2}/g, tech2)
      .replace(/{field}/g, field)
      .replace(/{concept}/g, concept)
      .replace(/{app}/g, app));

    if (i % 3 === 0) {
      const techImages = ["1517694712202-14dd9538aa97", "1587620962725-abab7fe55159", "1498050108023-c5249f4df085", "1555066931-4365d14bab8c"];
      const imageUrl = `https://images.unsplash.com/photo-${pick(techImages)}?w=1200&q=80&fit=crop`;
      contentBlocks.push(`![Image illustrating ${pick(CONCEPTS)}](${imageUrl})\n\n*Fig ${Math.floor(i / 3) + 1}: Modern implementation of ${pick(CONCEPTS)}*`);
      contentBlocks.push(`## ${pick(CONCEPTS)} in ${tech}\n\nAnother important aspect to consider is how ${pick(CONCEPTS)} interacts with your overall ${field} strategy.`);
    }
  }

  const content = contentBlocks.join("\n\n");
  const tags = Array.from(new Set([tech.toLowerCase(), ...Array(2).fill(0).map(() => pick(TAGS_POOL))])).join(",");

  // Get relevant images or fallback to generic
  const relevantImages = TECH_IMAGE_MAP[tech] || TECH_IMAGE_MAP[field] || GENERIC_TECH_IMAGES;
  const chosenThumbnail = `https://images.unsplash.com/photo-${pick(relevantImages)}?w=1200&q=80&fit=crop`;

  return {
    title,
    slug,
    excerpt,
    content,
    thumbnail: chosenThumbnail,
    status: ContentStatus.PUBLISHED,
    tags,
    readTime: rand(3, 15),
    authorId,
    createdAt: new Date(Date.now() - rand(0, 365) * 24 * 60 * 60 * 1000), // Random date in last year
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding Large Blog Data...");

  // Cleanup: Remove blogs with missing images
  const deleted = await prisma.blog.deleteMany({
    where: {
      OR: [
        { thumbnail: null },
        { thumbnail: "" },
      ],
    },
  });
  console.log(`🧹 Cleaned up ${deleted.count} blogs with missing thumbnails.`);

  // Get an author (Instructor or Admin)
  let author = await prisma.user.findFirst({
    where: { role: { in: [Role.ADMIN, Role.INSTRUCTOR] } },
  });

  if (!author) {
    console.log("⚠️ No Admin or Instructor found. Creating a default instructor...");
    author = await prisma.user.create({
      data: {
        name: "Blog Author",
        email: "author@coachnest.dev",
        password: "password123", // Should be hashed in real app but for seed it's okay if followed by seed.ts pattern
        role: Role.INSTRUCTOR,
      },
    });
  }

  const blogs = [];
  const COUNT = 50;

  console.log(`🚀 Generating ${COUNT} blogs...`);

  for (let i = 0; i < COUNT; i++) {
    blogs.push(generateBlog(i, author.id));
  }

  // Use createMany with skipDuplicates to avoid unique slug errors if run multiple times
  const result = await prisma.blog.createMany({
    data: blogs,
    skipDuplicates: true,
  });

  console.log(`✅ Successfully seeded ${result.count} blog posts!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
