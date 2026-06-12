import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://coachnest.com";

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: `${BASE_URL}/`,          lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
  { url: `${BASE_URL}/courses`,   lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
  { url: `${BASE_URL}/blog`,      lastModified: new Date(), changeFrequency: "daily",   priority: 0.8 },
  { url: `${BASE_URL}/features`,  lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE_URL}/about`,     lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE_URL}/contact`,   lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  { url: `${BASE_URL}/careers`,   lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  { url: `${BASE_URL}/press`,     lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  { url: `${BASE_URL}/legal/privacy-policy`,  lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE_URL}/legal/terms-of-service`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE_URL}/legal/refund-policy`,   lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE_URL}/legal/cookie-policy`,   lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [courses, blogs] = await Promise.allSettled([
    prisma.course.findMany({
      where:  { status: "PUBLISHED", organizationId: null },
      select: { id: true, updatedAt: true },
    }),
    prisma.blog.findMany({
      where:  { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const courseRoutes: MetadataRoute.Sitemap =
    courses.status === "fulfilled"
      ? courses.value.map((c) => ({
          url:             `${BASE_URL}/courses/${c.id}`,
          lastModified:    c.updatedAt,
          changeFrequency: "weekly" as const,
          priority:        0.8,
        }))
      : [];

  const blogRoutes: MetadataRoute.Sitemap =
    blogs.status === "fulfilled"
      ? blogs.value.map((b) => ({
          url:             `${BASE_URL}/blog/${b.slug}`,
          lastModified:    b.updatedAt,
          changeFrequency: "weekly" as const,
          priority:        0.7,
        }))
      : [];

  return [...STATIC_ROUTES, ...courseRoutes, ...blogRoutes];
}
